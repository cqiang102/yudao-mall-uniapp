<template>
  <s-layout title="门店">
    <!-- 首页装修（M-02）：banner / 金刚区 / 推荐菜品位，按 sort 渲染 -->
    <view v-if="decorList.length" class="decor">
      <template v-for="d in decorList" :key="d.id">
        <swiper v-if="d.type === 1" class="d-banner" circular autoplay indicator-dots>
          <swiper-item @tap="goDecorLink(d)">
            <image :src="d.image" mode="aspectFill" class="d-banner-img" />
          </swiper-item>
        </swiper>
        <view v-else-if="d.type === 2" class="d-quick">
          <view class="d-quick-item" @tap="goDecorLink(d)">
            <image v-if="d.image" :src="d.image" mode="aspectFill" class="d-quick-img" />
            <text v-else class="d-quick-emoji">⭐</text>
            <text class="d-quick-name">{{ d.title }}</text>
          </view>
        </view>
        <view v-else-if="d.type === 3" class="d-reco">
          <text class="d-reco-title">{{ d.title }}</text>
          <scroll-view scroll-x class="d-reco-scroll">
            <view class="d-reco-row">
              <view v-for="dish in recoDishes" :key="dish.id" class="d-reco-item">
                <image v-if="dish.image" :src="dish.image" mode="aspectFill" class="d-reco-img" />
                <text class="d-reco-name">{{ dish.name }}</text>
                <text class="d-reco-price">¥{{ ((dish.price || 0) / 100).toFixed(2) }}</text>
              </view>
            </view>
          </scroll-view>
        </view>
      </template>
    </view>
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
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import sheep from '@/sheep';
import RestaurantStoreApi from '@/sheep/api/restaurant/store';
import RestaurantHomeDecorApi from '@/sheep/api/restaurant/homedecor';
import request from '@/sheep/request';

const list = ref([]);

// ========== 首页装修（M-02） ==========
const decorList = ref([]);
const recoDishes = ref([]);
const sid = uni.getStorageSync('restaurant-store-id') || 0;

async function loadDecor() {
  if (!sid) return;
  try {
    const res = await RestaurantHomeDecorApi.getList(sid);
    if (res.code === 0) {
      decorList.value = res.data || [];
      // 有推荐菜品位 → 拉本店菜品（前 8 个）
      if (decorList.value.some((d) => d.type === 3)) {
        const dishRes = await request({
          url: '/member/dish/simple-list',
          method: 'GET',
          params: { storeId: sid },
          custom: { showLoading: false },
        });
        if (dishRes.code === 0) recoDishes.value = (dishRes.data || []).slice(0, 8);
      }
    }
  } catch (e) {
    // 装修失败不影响门店列表
  }
}
loadDecor();

function goDecorLink(d) {
  if (!d.link) return;
  if (d.link.startsWith('http')) {
    sheep.$router.go('/pages/public/webview', { url: d.link });
    return;
  }
  sheep.$router.go(d.link);
}

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
/* 首页装修（M-02） */
.decor { padding: 0 20rpx; }
.d-banner { height: 280rpx; border-radius: 12rpx; overflow: hidden; margin-bottom: 20rpx; }
.d-banner-img { width: 100%; height: 100%; }
.d-quick { display: flex; background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.d-quick-item { width: 120rpx; text-align: center; }
.d-quick-img { width: 80rpx; height: 80rpx; border-radius: 16rpx; }
.d-quick-emoji { font-size: 56rpx; }
.d-quick-name { display: block; font-size: 24rpx; margin-top: 8rpx; }
.d-reco { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.d-reco-title { display: block; font-size: 30rpx; font-weight: 600; margin-bottom: 16rpx; }
.d-reco-scroll { white-space: nowrap; }
.d-reco-row { display: inline-flex; }
.d-reco-item { display: inline-block; width: 160rpx; margin-right: 16rpx; text-align: center; }
.d-reco-img { width: 160rpx; height: 160rpx; border-radius: 12rpx; }
.d-reco-name { display: block; font-size: 24rpx; margin-top: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.d-reco-price { color: #fa5151; font-size: 24rpx; }
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
