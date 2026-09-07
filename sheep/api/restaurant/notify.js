import request from '@/sheep/request';

// 餐饮 - 订阅消息（消费者端，M-12）
// 后端：cn.iocoder.yudao.module.restaurant.controller.app.notify.AppNotifyController
// 前缀：/app-api  userType=MEMBER
const RestaurantNotifyApi = {
  // 获取需引导用户订阅的模板 ID 列表（供 uni.requestSubscribeMessage 的 tmplIds）
  // 微信规定 requestSubscribeMessage 必须由用户点击触发（不能放 onLoad/onShow），
  // 因此在「提交订单」按钮的 tap 处理中调用
  getSubscribeTemplateIds: () => {
    return request({
      url: '/member/notify/template-ids',
      method: 'GET',
      custom: {
        showLoading: false,
      },
    });
  },
};

/**
 * 订阅引导（fire-and-forget）：拉取模板 ID → 弹出微信订阅授权框。
 * 无论用户 accept / reject / 接口失败，都不影响下单主流程（返回 Promise 仅供 await 控制时序）。
 */
export async function requestOrderSubscribe() {
  try {
    const res = await RestaurantNotifyApi.getSubscribeTemplateIds();
    const tmplIds = (res.code === 0 && Array.isArray(res.data)) ? res.data : [];
    if (!tmplIds.length) {
      return; // 商家未配置模板，静默跳过
    }
    // #ifdef MP-WEIXIN
    uni.requestSubscribeMessage({
      tmplIds,
      complete: () => {}, // accept/reject/ban 均不阻断下单
    });
    // #endif
  } catch (e) {
    // 网络失败等一律静默，绝不影响下单
  }
}

export default RestaurantNotifyApi;
