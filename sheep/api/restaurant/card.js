import request from '@/sheep/request';

// 餐饮 - 会员卡（消费者端，M-26）
// 后端：cn.iocoder.yudao.module.restaurant.controller.app.member.AppMemberCardController
// 前缀：/app-api  userId 由登录态注入（购卡扣的是本人钱包余额）
// 表：restaurant_member_card / restaurant_member_card_order（m19_member_card.sql）
const RestaurantCardApi = {
  // 在售会员卡列表（status=1，按 sort 倒序）
  getOnSaleList: () => {
    return request({
      url: '/member/card/list',
      method: 'GET',
      custom: {
        showLoading: false,
      },
    });
  },
  // 余额购卡 { cardId }，后端事务：扣余额→CAS累加已售→写购买记录
  buy: (cardId) => {
    return request({
      url: '/member/card/buy',
      method: 'POST',
      data: { cardId },
    });
  },
  // 我的购卡记录（分页）
  getMyRecords: (pageNo = 1, pageSize = 10) => {
    return request({
      url: '/member/card/my-records',
      method: 'GET',
      params: { pageNo, pageSize },
      custom: {
        showLoading: false,
      },
    });
  },
};

export default RestaurantCardApi;
