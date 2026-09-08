import request from '@/sheep/request';

// 餐饮 - 用户中心（消费者端，C-12）
// 后端：cn.iocoder.yudao.module.restaurant.controller.app.help.AppUserCenterController
// 前缀：/app-api  userType=MEMBER
const RestaurantUserCenterApi = {
  // 历史消费汇总（累计金额/订单数/最近下单）
  getConsumeSummary: () => {
    return request({
      url: '/member/user-center/consume-summary',
      method: 'GET',
      custom: { showLoading: false },
    });
  },

  // 帮助/关于列表（type：1-帮助 2-关于）
  getHelpList: (type) => {
    return request({
      url: '/member/user-center/help-list',
      method: 'GET',
      params: { type },
      custom: { showLoading: false },
    });
  },
};

export default RestaurantUserCenterApi;
