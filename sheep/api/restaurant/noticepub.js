import request from '@/sheep/request';

// 餐饮 - 公告（消费者端，P-07）
// 后端：cn.iocoder.yudao.module.restaurant.controller.app.notice.AppNoticeController
// 前缀：/app-api  userType=MEMBER
const RestaurantNoticeApi = {
  // 公告列表（本店 + 全平台，已发布）
  getList: (storeId) => {
    return request({
      url: '/member/notice/list',
      method: 'GET',
      params: { storeId },
      custom: { showLoading: false },
    });
  },
};

export default RestaurantNoticeApi;
