/**
 * 门店端专用请求封装（店员/收银工作台）
 * @description 与消费者端 sheep/request 完全隔离：
 *   - 走 /admin-api 前缀（门店店员 = 后台 ADMIN 账号体系）
 *   - token 独立存储（store-token / store-refresh-token），不污染会员登录态
 *   - 401 统一跳门店登录页（MVP 不做无感刷新，过期重新登录）
 */
import Request from 'luch-request';
import { baseUrl, tenantId } from '@/sheep/config';
import { getTerminal } from '@/sheep/helper/const';

const options = {
  showSuccess: false,
  successMsg: '',
  showError: true,
  errorMsg: '',
  showLoading: true,
  loadingMsg: '加载中',
};

const STORE_TOKEN_KEY = 'store-token';
const STORE_REFRESH_TOKEN_KEY = 'store-refresh-token';

export const getStoreToken = () => uni.getStorageSync(STORE_TOKEN_KEY);
export const getStoreRefreshToken = () => uni.getStorageSync(STORE_REFRESH_TOKEN_KEY);

export const setStoreToken = (accessToken, refreshToken) => {
  uni.setStorageSync(STORE_TOKEN_KEY, accessToken);
  if (refreshToken) {
    uni.setStorageSync(STORE_REFRESH_TOKEN_KEY, refreshToken);
  }
};

export const clearStoreToken = () => {
  uni.removeStorageSync(STORE_TOKEN_KEY);
  uni.removeStorageSync(STORE_REFRESH_TOKEN_KEY);
};

/** 是否已登录门店端 */
export const isStoreLogin = () => !!getStoreToken();

/** 退出门店端登录 */
export const storeLogout = () => {
  clearStoreToken();
  uni.reLaunch({ url: '/pages/restaurant/store-login' });
};

const http = new Request({
  // 门店端走 admin-api（店员是后台账号 + 门店角色）
  baseURL: baseUrl + '/admin-api',
  timeout: 8000,
  method: 'GET',
  header: {
    Accept: 'text/json',
    'Content-Type': 'application/json;charset=UTF-8',
  },
  // #ifdef APP-PLUS
  sslVerify: false,
  // #endif
  custom: options,
});

http.interceptors.request.use(
  (config) => {
    const token = getStoreToken();
    if (token) {
      config.header['Authorization'] = token;
    }
    config.header['Accept'] = '*/*';
    config.header['tenant-id'] = uni.getStorageSync('tenant-id') || tenantId;
    if (config.custom.showLoading) {
      uni.showLoading({ title: config.custom.loadingMsg, mask: true });
    }
    return config;
  },
  (error) => Promise.reject(error),
);

http.interceptors.response.use(
  (response) => {
    if (response.config.custom.showLoading) {
      uni.hideLoading();
    }
    if (response.data.code !== 0) {
      // 401：门店登录过期 → 清 token 回登录页
      if (response.data.code === 401) {
        clearStoreToken();
        uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/restaurant/store-login' });
        }, 800);
        return Promise.reject(response.data);
      }
      if (response.config.custom.showError) {
        uni.showToast({
          title: response.data.msg || '服务器开小差啦，请稍后再试~',
          icon: 'none',
          mask: true,
        });
      }
    }
    if (
      response.config.custom.showSuccess &&
      response.config.custom.successMsg !== '' &&
      response.data.code === 0
    ) {
      uni.showToast({ title: response.config.custom.successMsg, icon: 'none' });
    }
    return Promise.resolve(response.data);
  },
  (error) => {
    if (error && error.config) {
      if (error.config.custom.showLoading) {
        uni.hideLoading();
      }
      if (error.config.custom.showError) {
        uni.showToast({
          title: error.data?.msg || error.errMsg || '网络请求出错',
          icon: 'none',
          mask: true,
        });
      }
    }
    return false;
  },
);

const request = (config) => {
  return http.middleware(config);
};

export default request;
