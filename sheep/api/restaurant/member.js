import request from '@/sheep/request';

// 餐饮 - 会员档案（消费者端）
// 后端：cn.iocoder.yudao.module.restaurant.controller.app.member.MemberController
// 前缀：/app-api  userType=MEMBER
// 安全约定（P0-3）：userId 一律由后端从登录态取，前端【禁止】传 userId，杜绝盗用他人档案。
//      首次进入「我的」时调 bind 自动 getOrCreateMember，再调 get 取档案详情。
const RestaurantMemberApi = {
  // 获取或创建我的餐饮会员档案，返回 MemberDO（含 id / pointBalance / growthValue / level ...）
  bind: () => {
    return request({
      url: '/member/me/bind',
      method: 'POST',
      custom: {
        showLoading: false,
      },
    });
  },
  // 获取我的会员档案详情（MemberVO.RespVO，含 id / pointBalance 积分 / growthValue / levelName）
  get: () => {
    return request({
      url: '/member/me/get',
      method: 'GET',
      custom: {
        showLoading: false,
      },
    });
  },
};

export default RestaurantMemberApi;
