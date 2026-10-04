import request from '@/sheep/request';

// 餐饮 - 优惠券（消费者端）
// 后端：cn.iocoder.yudao.module.restaurant.controller.app.coupon.CouponController
// 前缀：/app-api  userType=MEMBER
// 安全约定（P0-3）：userId 一律由后端从登录态取，前端【禁止】传 userId。
  const RestaurantCouponApi = {
    // 领券中心：可领取的券模板列表（仅启用中；含 stockLeft/claimedCount/canClaim）
    availableList: () => {
      return request({
        url: '/member/coupon/available-list',
        method: 'GET',
        custom: {
          showLoading: false,
        },
      });
    },
    // 我的券列表（userId 由后端登录态注入）
    // status?: 0未使用 1已使用 2过期；不传查全部
  myList: (status) => {
    return request({
      url: '/member/coupon/my-list',
      method: 'GET',
      params: status === undefined ? {} : { status },
      custom: {
        showLoading: false,
      },
    });
  },
  // 领取优惠券（templateId 为券模板 id）
  receive: (templateId) => {
    return request({
      url: '/member/coupon/claim',
      method: 'POST',
      params: { templateId },
      custom: {
        showSuccess: true,
        successMsg: '领取成功',
        loadingMsg: '领取中',
      },
    });
  },
};

export default RestaurantCouponApi;
