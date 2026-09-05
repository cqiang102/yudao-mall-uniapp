import request from '@/sheep/request';

// 餐饮 - 轮播图（消费者端）
// 后端：cn.iocoder.yudao.module.restaurant.controller.app.banner.AppBannerController
// 前缀：/app-api  userType=MEMBER（会员 token 自动由 sheep/request 注入）
// 表：restaurant_banner（m17_banner.sql）
const RestaurantBannerApi = {
  // 启用中的轮播图列表（首页 swiper 用，后端按 sort 倒序，仅 status=1）
  getBannerList: () => {
    return request({
      url: '/member/banner/list',
      method: 'GET',
      custom: {
        showLoading: false,
      },
    });
  },
};

export default RestaurantBannerApi;
