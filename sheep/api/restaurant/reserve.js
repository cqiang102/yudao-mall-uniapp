import request from '@/sheep/request';

// 餐饮 - 预约（消费者端，M-09 / C-15）
// 后端：cn.iocoder.yudao.module.restaurant.controller.app.reserve.AppReserveController
// 前缀：/app-api  userType=MEMBER
const RestaurantReserveApi = {
  // 查询某天可预约时段（含剩余人数；门店未配置规则时返回空数组 → 前端回退自由选择）
  getSlots: (storeId, date) => {
    return request({
      url: '/member/reserve/slots',
      method: 'GET',
      params: { storeId, date },
      custom: {
        showLoading: false,
      },
    });
  },
};

export default RestaurantReserveApi;
