<template>
  <view class="page">
    <!-- Tab 切换 -->
    <view class="tabs">
      <view class="tab" :class="{ active: tab === 'goods' }" @tap="tab = 'goods'">商品兑换</view>
      <view class="tab" :class="{ active: tab === 'mine' }" @tap="switchMine">我的兑换</view>
    </view>

    <!-- 商品列表 -->
    <view v-if="tab === 'goods'">
      <view v-if="products.length" class="goods">
        <view v-for="p in products" :key="p.id" class="goods-card">
          <image v-if="p.image" :src="p.image" class="goods-img" mode="aspectFill" />
          <view v-else class="goods-img goods-img-empty">🎁</view>
          <view class="goods-info">
            <view class="goods-name">{{ p.name }}</view>
            <view class="goods-desc" v-if="p.description">{{ p.description }}</view>
            <view class="goods-bottom">
              <view class="points">{{ p.points }} 积分</view>
              <view
                class="exchange-btn"
                :class="{ disabled: p.stock === 0 }"
                @tap="onExchange(p)"
              >
                {{ p.stock === 0 ? '已兑完' : '兑换' }}
              </view>
            </view>
          </view>
        </view>
      </view>
      <view v-else class="empty">该门店暂无积分商品</view>
    </view>

    <!-- 我的兑换 -->
    <view v-else>
      <view v-if="myOrders.length" class="orders">
        <view v-for="o in myOrders" :key="o.id" class="order-card">
          <view class="order-top">
            <text class="order-name">{{ o.productName }} x{{ o.quantity }}</text>
            <text class="order-status" :class="'s' + o.status">{{ statusText(o.status) }}</text>
          </view>
          <view class="order-mid">消耗 {{ o.totalPoints }} 积分</view>
          <view v-if="o.status === 0" class="verify-box">
            <text class="verify-code">{{ o.verifyCode }}</text>
            <text class="verify-tip">到店出示此码</text>
          </view>
          <view class="order-bottom">
            <text class="order-time">{{ o.createTime }}</text>
            <text v-if="o.status === 0" class="cancel-btn" @tap="onCancel(o)">取消兑换</text>
          </view>
        </view>
      </view>
      <view v-else class="empty">暂无兑换记录</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app';
import PointShopApi from '@/sheep/api/restaurant/pointshop';
import { resolveStoreId, setStoredStoreId } from '@/sheep/helper/restaurant-store';

const tab = ref('goods');
// 会员端商品按门店隔离：从门店/菜单页跳入时携带 storeId
const storeId = ref(null);
const products = ref([]);
const myOrders = ref([]);
const statusMap = { 0: '待核销', 1: '已核销', 2: '已取消' };
const statusText = (s) => statusMap[s] || '未知';

onLoad(async (opts) => {
  // 2026-10-03：带 storeId 进入时记住它；不带参数（底部导航 / 我的菜单宫格进入）
  // 则用统一兜底取门店（本地记忆 → 门店列表第一个）。
  // 注意：URL 里可能传来 "0"（历史写法拼的 `storeId=0`），0 不是有效门店，
  // 必须走兜底，否则商品按"全平台"查会查不到（后端会按 storeId 精确匹配）。
  const fromUrl = Number(opts?.storeId || 0);
  storeId.value = fromUrl > 0 ? setStoredStoreId(fromUrl) : await resolveStoreId();
  if (storeId.value) loadGoods();
  else uni.showToast({ title: '请从门店页进入', icon: 'none' });
});
onPullDownRefresh(async () => {
  if (tab.value === 'goods') await loadGoods();
  else await loadMine();
  uni.stopPullDownRefresh();
});

async function loadGoods() {
  const { code, data } = await PointShopApi.getProductPage({
    storeId: storeId.value,
    pageNo: 1,
    pageSize: 50,
  });
  if (code === 0) products.value = data.list || [];
}

async function loadMine() {
  const { code, data } = await PointShopApi.getMyOrders({ pageNo: 1, pageSize: 50 });
  if (code === 0) myOrders.value = data.list || [];
}

function switchMine() {
  tab.value = 'mine';
  loadMine();
}

function onExchange(p) {
  if (p.stock === 0) return;
  if (!storeId.value) {
    uni.showToast({ title: '请从门店页进入积分商城', icon: 'none' });
    return;
  }
  uni.showModal({
    title: '确认兑换',
    content: `使用 ${p.points} 积分兑换「${p.name}」？`,
    success: async (res) => {
      if (res.confirm !== true) return;
      // 积分商品是门店级的：后端会校验 storeId 与商品归属门店一致，故必须带上
      const { code, data, msg } = await PointShopApi.exchange({
        storeId: storeId.value,
        productId: p.id,
        quantity: 1,
      });
      if (code !== 0) {
        uni.showToast({ title: msg || '兑换失败', icon: 'none' });
        return;
      }
      uni.showModal({
        title: '兑换成功',
        content: `核销码：${data.verifyCode}，到店出示即可取货`,
        showCancel: false,
        success: () => switchMine(),
      });
    },
  });
}

function onCancel(o) {
  uni.showModal({
    title: '取消兑换',
    content: `取消后 ${o.totalPoints} 积分将退回，确认取消？`,
    success: async (res) => {
      if (res.confirm !== true) return;
      await PointShopApi.cancelOrder(o.id);
      loadMine();
    },
  });
}
</script>

<style lang="scss" scoped>
.page { padding: 20rpx; min-height: 100vh; background: #f5f5f5; }
.tabs { display: flex; background: #fff; border-radius: 12rpx; margin-bottom: 20rpx; }
.tab { flex: 1; text-align: center; padding: 24rpx 0; font-size: 28rpx; color: #666; }
.tab.active { color: #fa5151; font-weight: 600; border-bottom: 4rpx solid #fa5151; }
.goods-card { display: flex; background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx; }
.goods-img { width: 160rpx; height: 160rpx; border-radius: 12rpx; flex-shrink: 0; }
.goods-img-empty { display: flex; align-items: center; justify-content: center; background: #f0f0f0; font-size: 60rpx; }
.goods-info { flex: 1; margin-left: 20rpx; display: flex; flex-direction: column; justify-content: space-between; }
.goods-name { font-size: 30rpx; font-weight: 600; }
.goods-desc { font-size: 24rpx; color: #999; margin-top: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.goods-bottom { display: flex; justify-content: space-between; align-items: center; }
.points { color: #fa5151; font-size: 30rpx; font-weight: 600; }
.exchange-btn { background: #fa5151; color: #fff; padding: 8rpx 32rpx; border-radius: 28rpx; font-size: 26rpx; }
.exchange-btn.disabled { background: #ccc; }
.order-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.order-top { display: flex; justify-content: space-between; font-size: 28rpx; font-weight: 600; }
.order-status.s0 { color: #ff9900; }
.order-status.s1 { color: #07c160; }
.order-status.s2 { color: #999; }
.order-mid { color: #666; font-size: 26rpx; margin: 12rpx 0; }
.verify-box { background: #fff7e6; border-radius: 8rpx; padding: 16rpx; display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.verify-code { font-size: 40rpx; font-weight: 700; letter-spacing: 6rpx; color: #fa5151; }
.verify-tip { color: #999; font-size: 24rpx; }
.order-bottom { display: flex; justify-content: space-between; align-items: center; }
.order-time { color: #999; font-size: 24rpx; }
.cancel-btn { color: #666; font-size: 26rpx; padding: 6rpx 20rpx; border: 1rpx solid #ddd; border-radius: 24rpx; }
.empty { text-align: center; color: #999; padding: 120rpx 0; }
</style>
