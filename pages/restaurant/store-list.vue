<template>
  <s-layout title="门店">
    <view class="store-list">
      <view v-for="s in list" :key="s.id" class="store-card">
        <view class="s-top">
          <text class="s-name">{{ s.name }}</text>
          <text class="s-dist" v-if="s.distanceKm !== null && s.distanceKm !== undefined">
            {{ s.distanceKm.toFixed(2) }}km
          </text>
        </view>
        <view class="s-row">
          <text class="s-label">地址</text>
          <text class="s-value">{{ s.address || '—' }}</text>
        </view>
        <view class="s-row">
          <text class="s-label">电话</text>
          <text class="s-value">{{ s.phone || '—' }}</text>
        </view>
        <view class="s-row">
          <text class="s-label">营业</text>
          <text class="s-value">
            {{ s.businessStart || '?' }} ~ {{ s.businessEnd || '?' }}
            <text :class="s.status === 1 ? 's-open' : 's-close'">
              {{ s.status === 1 ? '营业中' : '已打烊' }}
            </text>
          </text>
        </view>
        <view class="s-ops">
          <text class="s-btn" @tap="nav(s)">导航</text>
          <text class="s-btn s-btn-plain" @tap="call(s)">拨号</text>
          <text class="s-btn s-btn-main" @tap="order(s)">去点餐</text>
        </view>
      </view>
      <view v-if="!list.length" class="empty">暂无门店</view>
    </view>
  </s-layout>
</template>

<script setup>
import { ref, onLoad } from 'vue';
import sheep from '@/sheep';
import RestaurantStoreApi from '@/sheep/api/restaurant/store';

const list = ref([]);

onLoad(async () => {
  await load();
});

async function load() {
  let lat = null;
  let lng = null;
  // 定位失败也要能看门店列表（无距离排序）
  try {
    const loc = await new Promise((resolve, reject) => {
      uni.getLocation({
        type: 'gcj02',
        success: resolve,
        fail: reject,
      });
    });
    lat = loc.latitude;
    lng = loc.longitude;
  } catch (e) {
    // 未授权定位：静默降级
  }
  const res = await RestaurantStoreApi.getStoreList(lat, lng);
  if (res.code === 0) list.value = res.data || [];
}

function nav(s) {
  if (!s.latitude || !s.longitude) {
    uni.showToast({ title: '该门店未配置坐标', icon: 'none' });
    return;
  }
  uni.openLocation({
    latitude: s.latitude,
    longitude: s.longitude,
    name: s.name,
    address: s.address || '',
  });
}
function call(s) {
  if (!s.phone) {
    uni.showToast({ title: '该门店未留电话', icon: 'none' });
    return;
  }
  uni.makePhoneCall({ phoneNumber: s.phone });
}
function order(s) {
  uni.setStorageSync('restaurant-store-id', s.id);
  sheep.$router.go('/pages/restaurant/menu', { storeId: s.id });
}
</script>

<style lang="scss" scoped>
.store-list { padding: 20rpx; }
.store-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.s-top { display: flex; justify-content: space-between; align-items: center; }
.s-name { font-size: 32rpx; font-weight: 600; }
.s-dist { font-size: 24rpx; color: #fa5151; }
.s-row { display: flex; margin-top: 12rpx; font-size: 26rpx; }
.s-label { width: 80rpx; color: #999; }
.s-value { flex: 1; color: #333; }
.s-open { color: #07c160; margin-left: 12rpx; }
.s-close { color: #999; margin-left: 12rpx; }
.s-ops { display: flex; justify-content: flex-end; margin-top: 20rpx; }
.s-btn { margin-left: 16rpx; padding: 10rpx 28rpx; border-radius: 28rpx; font-size: 26rpx; background: #fa5151; color: #fff; }
.s-btn-plain { background: #fff; color: #666; border: 1rpx solid #ddd; }
.s-btn-main { background: #ff9500; }
.empty { text-align: center; color: #999; padding: 120rpx 0; }
</style>
