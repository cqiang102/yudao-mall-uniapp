import RestaurantStoreApi from '@/sheep/api/restaurant/store';

/**
 * 餐饮 - 当前门店（消费者端）工具
 *
 * 背景（2026-10-03）：资讯 / 公告 / 积分商城 / 门店装修等接口都要求传 storeId，
 * 而消费者端进入这些页面的路径不止「扫桌码」和「门店列表选店」两种：
 * 还有底部导航直达、以及从「我的」的菜单宫格进入 —— 这些路径都没有 URL 参数。
 * 原先各页面写的是 `uni.getStorageSync('restaurant-store-id') || 0`，
 * 于是新用户（从未选过店）会传 0 → 后端按「全平台」查 → 该店的内容一条也查不到，
 * 页面表现为「暂无资讯 / 暂无公告 / 暂无积分商品」，看起来像功能没做。
 *
 * 这里提供统一的兜底：本地记忆优先，没有记忆就取门店列表的第一个并记入本地，
 * 保证「按店查询」的页面总有确定的门店上下文。
 */

const STORAGE_KEY = 'restaurant-store-id';

/** 同步读取本地记忆的门店编号（没有则返回 0） */
export function getStoredStoreId() {
  return Number(uni.getStorageSync(STORAGE_KEY) || 0);
}

/** 记住当前门店（id 为空时忽略） */
export function setStoredStoreId(id) {
  const n = Number(id || 0);
  if (n > 0) {
    uni.setStorageSync(STORAGE_KEY, n);
  }
  return n;
}

/**
 * 解析「当前门店编号」：
 *   1) 有本地记忆 → 直接用
 *   2) 没有 → 拉门店列表取第一个，并记入本地（下次直接命中）
 *   3) 都拿不到 → 返回 0（后端按「全平台」处理，不会报错）
 *
 * 用法：`const storeId = await resolveStoreId();`
 * @returns {Promise<number>} 门店编号（≥0）
 */
export async function resolveStoreId() {
  const cached = getStoredStoreId();
  if (cached > 0) {
    return cached;
  }
  try {
    const res = await RestaurantStoreApi.getStoreList();
    const first = res && res.code === 0 && Array.isArray(res.data) ? res.data[0] : null;
    if (first && first.id) {
      return setStoredStoreId(first.id);
    }
  } catch (e) {
    // 静默降级：取不到门店时按全平台处理，不阻断页面
    console.warn('[restaurant-store] 门店列表获取失败，按全平台处理', e);
  }
  return 0;
}

export default {
  getStoredStoreId,
  setStoredStoreId,
  resolveStoreId,
};
