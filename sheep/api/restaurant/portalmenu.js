import request from '@/sheep/request';

// 餐饮 - 我的服务菜单（消费者端，M-24）
// 后端：cn.iocoder.yudao.module.restaurant.controller.app.portal.AppPortalMenuController
// 前缀：/app-api  userType=MEMBER
const RestaurantPortalMenuApi = {
  // 会员可见菜单（本店优先，无配置回退平台默认 storeId=0）
  getMemberMenuList: (storeId) => {
    return request({
      url: '/member/portal-menu/list',
      method: 'GET',
      params: { storeId },
      custom: {
        showLoading: false,
      },
    });
  },
};

export default RestaurantPortalMenuApi;
