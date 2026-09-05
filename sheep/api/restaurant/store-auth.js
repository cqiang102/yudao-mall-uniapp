import request from '@/sheep/request/store-request';

// 餐饮 - 门店端认证（店员/收银）
// 后端：cn.iocoder.yudao.module.restaurant.controller.admin.store.auth.StoreAuthController
// 前缀：/admin-api/store-auth（PermitAll，复用后台 ADMIN 账号 + 门店角色）
// socialType 固定 34 = WECHAT_MINI_PROGRAM
const SOCIAL_TYPE_WECHAT_MINI = 34;

const StoreAuthApi = {
  /**
   * 微信小程序登录（已绑定用户）
   * @param code wx.login 获取的授权码
   * @returns {Promise<{code, data: {accessToken, refreshToken, userId, nickname}}>}
   *          未绑定时后端抛 STORE_USER_NOT_BOUND（code!=0），前端引导走 bind
   */
  weixinMiniAppLogin: (code) => {
    return request({
      url: '/store-auth/weixin-mini-app-login',
      method: 'POST',
      data: { socialType: SOCIAL_TYPE_WECHAT_MINI, code, state: '' },
      custom: { showLoading: true, loadingMsg: '登录中', showError: false },
    });
  },

  /**
   * 绑定微信到后台账号（店员首次使用）
   * @param code wx.login 授权码
   * @param username 后台登录账号
   * @param password 后台登录密码
   */
  bind: (code, username, password) => {
    return request({
      url: '/store-auth/bind',
      method: 'POST',
      data: { socialType: SOCIAL_TYPE_WECHAT_MINI, code, state: '', username, password },
      custom: { showLoading: true, loadingMsg: '绑定中' },
    });
  },
};

export default StoreAuthApi;
