import request from '@/sheep/request';

// 餐饮 - 电子发票（消费者端，M-35 MVP 壳）
// 后端：cn.iocoder.yudao.module.restaurant.controller.app.invoice.AppInvoiceController
// 前缀：/app-api  userType=MEMBER
// 开票为线下人工开具：申请后商户后台标记已开票/驳回
const RestaurantInvoiceApi = {
  // 我的发票抬头
  getTitleList: () => {
    return request({ url: '/member/invoice/title-list', method: 'GET', custom: { showLoading: false } });
  },

  // 保存抬头（有 id 为更新）
  saveTitle: (data) => {
    return request({ url: '/member/invoice/title-save', method: 'POST', data });
  },

  // 删除抬头
  deleteTitle: (id) => {
    return request({ url: '/member/invoice/title-delete', method: 'DELETE', params: { id } });
  },

  // 申请开票（orderId 必填；titleId 或 type+title 二选一）
  apply: (data) => {
    return request({ url: '/member/invoice/apply', method: 'POST', data });
  },

  // 我的开票记录
  getMyList: () => {
    return request({ url: '/member/invoice/my-list', method: 'GET', custom: { showLoading: false } });
  },
};

export default RestaurantInvoiceApi;
