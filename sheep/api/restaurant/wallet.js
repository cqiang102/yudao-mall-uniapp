import request from '@/sheep/request';
import PayOrderApi from '@/sheep/api/pay/order';

// 餐饮 - 会员储值充值（消费者端）
// 后端：cn.iocoder.yudao.module.restaurant.controller.app.member.MemberRechargeController
// 前缀：/app-api  userType=MEMBER(2)
// 安全约定（P0-3）：userId 一律由后端从登录态取，前端【禁止】传 userId。
const RestaurantWalletApi = {
  // 获取会员钱包余额（芋道 PayWallet，userId 由后端登录态注入）
  // 返回 PayWalletRespDTO：{ id, userId, userType, balance(分), totalRecharge, totalExpense, ... }
  getWallet: (userType) => {
    return request({
      url: '/member/recharge/wallet',
      method: 'GET',
      params: { userType },
      custom: { showLoading: false },
    });
  },

  // 创建储值充值单，返回芋道 pay_order.id（供拉起微信支付）
  // data: { userType, appKey, payAmount(分), giftAmount(分) }  （userId 由后端登录态取）
  createRecharge: (data) => {
    return request({
      url: '/member/recharge/create',
      method: 'POST',
      params: data,
      custom: { loadingMsg: '发起充值' },
    });
  },

  // 我的充值记录分页（userId 由后端登录态注入）
  // params: { pageNo, pageSize }
  getRechargePage: (params) => {
    return request({
      url: '/member/recharge/page',
      method: 'GET',
      params,
      custom: { showLoading: false },
    });
  },

  /**
   * 拉起微信支付完成充值（与订单支付同源）
   * @param payOrderId 芋道 pay_order.id（createRecharge 返回）
   * @param payChannelCode 默认 wx_lite（微信小程序）
   */
  async payRecharge(payOrderId, payChannelCode = 'wx_lite') {
    const submitRes = await PayOrderApi.submitOrder({ id: payOrderId, channelCode: payChannelCode });
    if (submitRes.code !== 0) {
      return submitRes;
    }
    const { displayMode, displayContent } = submitRes.data || {};
    if (displayMode !== 'wx_lite' || !displayContent) {
      return { code: -1, msg: '非微信小程序支付通道', data: submitRes.data };
    }
    const params = JSON.parse(displayContent);
    return new Promise((resolve) => {
      uni.requestPayment({
        timeStamp: params.timeStamp,
        nonceStr: params.nonceStr,
        package: params.packageStr,
        signType: params.signType,
        paySign: params.paySign,
        success: (res) => resolve({ code: 0, data: res }),
        fail: (err) => resolve({ code: -1, msg: err.errMsg || '支付失败', data: err }),
      });
    });
  },
};

export default RestaurantWalletApi;
