import request from '@/sheep/request';

// 餐饮 - 积分商城（消费者端，M-27）
// 后端：cn.iocoder.yudao.module.restaurant.controller.app.point.AppPointShopController
// 前缀：/app-api  userType=MEMBER
const PointShopApi = {
  // 上架积分商品分页（会员端只看上架）
  getProductPage: (params) => {
    return request({
      url: '/member/point-shop/product-page',
      method: 'GET',
      params,
      custom: { showLoading: false },
    });
  },

  // 积分兑换（扣积分 + 扣库存，返回核销码）
  exchange: (data) => {
    return request({
      url: '/member/point-shop/exchange',
      method: 'POST',
      data,
      custom: { showLoading: true, loadingMsg: '兑换中' },
    });
  },

  // 我的兑换列表（status: 0待核销 1已核销 2已取消）
  getMyOrders: (params) => {
    return request({
      url: '/member/point-shop/my-orders',
      method: 'GET',
      params,
      custom: { showLoading: false },
    });
  },

  // 取消兑换（仅待核销；退积分退库存）
  cancelOrder: (orderId) => {
    return request({
      url: '/member/point-shop/my-orders/cancel',
      method: 'PUT',
      params: { orderId },
      custom: { showSuccess: true, successMsg: '已取消，积分已退回' },
    });
  },
};

export default PointShopApi;
