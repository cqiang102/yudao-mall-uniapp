import request from '@/sheep/request';

// 餐饮 - 门店（消费者端）
// 后端：cn.iocoder.yudao.module.restaurant.controller.app.store.AppStoreController
// 前缀：/app-api  userType=MEMBER（会员 token 自动由 sheep/request 注入）
const RestaurantStoreApi = {
  // 门店公开信息（含配送费/起送价，下单外卖用）
  getStore: (id) => {
    return request({
      url: '/member/store/get?id=' + id,
      method: 'GET',
    });
  },
};

export default RestaurantStoreApi;
