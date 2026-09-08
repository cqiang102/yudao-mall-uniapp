import request from '@/sheep/request';

// 餐饮 - 资讯（消费者端，M-10 内容管理）
// 后端：cn.iocoder.yudao.module.restaurant.controller.app.content.AppNewsController
// 前缀：/app-api  userType=MEMBER
const RestaurantNewsApi = {
  // 资讯列表（本店 + 全平台，已发布）
  getList: (storeId) => {
    return request({
      url: '/member/news/list',
      method: 'GET',
      params: { storeId },
      custom: { showLoading: false },
    });
  },
};

export default RestaurantNewsApi;
