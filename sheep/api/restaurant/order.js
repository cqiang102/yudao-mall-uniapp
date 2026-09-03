import request from '@/sheep/request';
import PayOrderApi from '@/sheep/api/pay/order';

// 餐饮 - 订单（消费者端）
// 后端：cn.iocoder.yudao.module.restaurant.controller.app.order.ConsumerOrderController
// 前缀：/app-api  userType=MEMBER
const RestaurantOrderApi = {
  // 创建订单，返回 orderId（Long）
  // reqVO 字段见后端 OrderVO.CreateReqVO：storeId, type, tableId,
  //   items(List<{dishId, quantity, specIds?, remark?}>), remark?, ...
  createOrder: (data) => {
    return request({
      url: '/member/order/create',
      method: 'POST',
      data,
      custom: {
        showLoading: true,
        loadingMsg: '下单中',
      },
    });
  },

  // 订单详情
  getOrder: (id) => {
    return request({
      url: '/member/order/get',
      method: 'GET',
      params: { id },
      custom: {
        showLoading: false,
      },
    });
  },

  // 我的订单分页（PageReqVO: pageNo, pageSize, status?）
  getOrderPage: (params) => {
    return request({
      url: '/member/order/page',
      method: 'GET',
      params,
      custom: {
        showLoading: false,
      },
    });
  },

  // 余额支付（会员储值卡）
  // 注意：memberId 不再由前端传入，后端从登录态取（防越权盗刷他人余额）
  payBalance: (orderId) => {
    return request({
      url: '/member/order/pay-balance',
      method: 'POST',
      params: { orderId },
      custom: {
        showSuccess: true,
        successMsg: '支付成功',
        loadingMsg: '支付中',
      },
    });
  },

  /**
   * 微信支付链路（关键）：
   * 1) 调餐饮后端 pay-weixin，拿到【芋道 pay 的 payOrderId】
   *    （userId 由后端从登录态取，前端不再传，防身份伪造）
   * 2) 用 payOrderId 调芋道 Pay 标准预支付接口 /pay/order/submit，
   *    返回 displayMode=wx_lite 时，displayContent 为 JSON，
   *    含 { timeStamp, nonceStr, packageStr(需改名 package), signType, paySign }
   * 3) 调 wx.requestPayment 拉起微信收银台
   *
   * @param orderId 餐饮订单 id
   * @param appKey  餐饮 PayApp 的 appKey（芋道后台【支付管理-应用信息】查看）
   * @param payChannelCode 如 'wx_lite'（微信小程序），可配在 config
   */
  async payWeixin(orderId, appKey, payChannelCode = 'wx_lite') {
    // 第 1 步：餐饮后端生成 payOrder，返回 payOrderId
    const createRes = await request({
      url: '/member/order/pay-weixin',
      method: 'POST',
      params: {
        orderId,
        appKey,
        userIp: '127.0.0.1',
      },
      custom: {
        loadingMsg: '发起支付',
      },
    });
    if (createRes.code !== 0) {
      return createRes;
    }
    const payOrderId = createRes.data; // 芋道 pay_order.id

    // 第 2 步：调芋道 Pay 标准预支付，拿到微信小程序支付参数
    const submitRes = await PayOrderApi.submitOrder({
      id: payOrderId,
      channelCode: payChannelCode,
    });
    if (submitRes.code !== 0) {
      return submitRes;
    }
    const { displayMode, displayContent } = submitRes.data || {};
    if (displayMode !== 'wx_lite' || !displayContent) {
      return { code: -1, msg: '非微信小程序支付通道', data: submitRes.data };
    }
    // 第 3 步：拉起微信收银台
    const params = JSON.parse(displayContent);
    return new Promise((resolve) => {
      uni.requestPayment({
        timeStamp: params.timeStamp,
        nonceStr: params.nonceStr,
        package: params.packageStr, // 注意后端字段是 packageStr，前端要改成 package
        signType: params.signType,
        paySign: params.paySign,
        success: (res) => resolve({ code: 0, data: res }),
        fail: (err) => resolve({ code: -1, msg: err.errMsg || '支付失败', data: err }),
      });
    });
  },

  // 申请退款（消费者发起，原路退回）
  // orderId 必填；reason 选填
  applyRefund: (orderId, reason) => {
    return request({
      url: '/member/order/apply-refund',
      method: 'POST',
      params: { orderId, reason },
      custom: {
        showSuccess: true,
        successMsg: '退款申请已提交',
        loadingMsg: '提交中',
      },
    });
  },
};

export default RestaurantOrderApi;
