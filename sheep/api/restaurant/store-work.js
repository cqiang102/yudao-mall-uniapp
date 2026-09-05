import request from '@/sheep/request/store-request';

// 餐饮 - 门店端订单操作（店员/收银工作台）
// 后端：cn.iocoder.yudao.module.restaurant.controller.admin.order.AdminOrderController
// 前缀：/admin-api/store/order（ADMIN token；storeId 由后端按登录店员强制注入，防跨店越权）
const StoreWorkApi = {
  // 订单分页（服务端按登录店员绑定门店过滤；PageReqVO: pageNo/pageSize/status?）
  getOrderPage: (params) => {
    return request({
      url: '/store/order/page',
      method: 'GET',
      params,
      custom: { showLoading: false },
    });
  },

  // 接单（已支付 → 制作中）
  accept: (id) => {
    return request({
      url: '/store/order/accept',
      method: 'PUT',
      params: { id },
      custom: { showSuccess: true, successMsg: '已接单', loadingMsg: '处理中' },
    });
  },

  // 完成订单（制作中 → 已完成）
  complete: (id) => {
    return request({
      url: '/store/order/complete',
      method: 'PUT',
      params: { id },
      custom: { showSuccess: true, successMsg: '已完成', loadingMsg: '处理中' },
    });
  },

  // 叫号（记录叫号时间）
  call: (id) => {
    return request({
      url: '/store/order/call',
      method: 'POST',
      params: { id },
      custom: { showSuccess: true, successMsg: '已叫号', loadingMsg: '处理中' },
    });
  },

  // 现金收讫（待支付 → 已支付，收银员现场收现金）
  payCash: (id) => {
    return request({
      url: '/store/order/pay-cash',
      method: 'PUT',
      params: { id },
      custom: { showSuccess: true, successMsg: '现金收讫成功', loadingMsg: '收银中' },
    });
  },

  // 取消订单（仅待支付）
  cancel: (id) => {
    return request({
      url: '/store/order/cancel',
      method: 'PUT',
      params: { id },
      custom: { showSuccess: true, successMsg: '已取消', loadingMsg: '处理中' },
    });
  },

  // 退款（原路退回）
  refund: (id, reason) => {
    return request({
      url: '/store/order/refund',
      method: 'PUT',
      params: { id, reason },
      custom: { showSuccess: true, successMsg: '退款已发起', loadingMsg: '退款中' },
    });
  },

  // 扫码核销（凭核销码完成订单）
  verify: (verifyCode) => {
    return request({
      url: '/store/order/verify',
      method: 'POST',
      params: { verifyCode },
      custom: { showSuccess: true, successMsg: '核销成功', loadingMsg: '核销中' },
    });
  },
};

export default StoreWorkApi;
