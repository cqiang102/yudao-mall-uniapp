import request from '@/sheep/request';

// 餐饮 - 首页装修（消费者端，M-02）
// 后端：cn.iocoder.yudao.module.restaurant.controller.app.decor.AppHomeDecorController
// 前缀：/app-api  userType=MEMBER
const RestaurantHomeDecorApi = {
  // 门店装修条目（已启用，按 sort 升序）
  getList: (storeId) => {
    return request({
      url: '/member/home-decor/list',
      method: 'GET',
      params: { storeId },
      custom: { showLoading: false },
    });
  },
};

export default RestaurantHomeDecorApi;
