<template>
  <s-layout title="会员中心">
    <view class="member" v-if="profile">
      <view class="header">
        <text class="nick">{{ sheep.$store('user').userInfo?.nickname || '会员' }}</text>
        <text class="level">{{ profile.levelName || '普通会员' }}</text>
      </view>
      <view class="stats">
        <view class="stat" @tap="goRecharge">
          <text class="num">¥{{ (balance / 100).toFixed(2) }}</text>
          <text class="label">储值余额</text>
        </view>
        <view class="stat">
          <text class="num">{{ (profile.pointBalance || 0) }}</text>
          <text class="label">积分</text>
        </view>
        <view class="stat">
          <text class="num">{{ (profile.growthValue || 0) }}</text>
          <text class="label">成长值</text>
        </view>
        <view class="stat" @tap="goCoupon">
          <text class="num">{{ couponCount }}</text>
          <text class="label">我的券</text>
        </view>
      </view>

      <!-- 我的券列表（内联展开） -->
      <view v-if="showCoupons" class="coupon-panel">
        <view v-for="c in myCoupons" :key="c.id" class="coupon">
          <view class="c-top">
            <text class="c-name">{{ c.name }}</text>
            <text class="c-status">{{ couponStatusText(c.status) }}</text>
          </view>
          <text class="c-rule">{{ couponRuleText(c) }}</text>
        </view>
        <view v-if="!myCoupons.length" class="empty">暂无优惠券</view>
      </view>

      <view class="menu">
        <view class="menu-item" @tap="goRecharge">会员储值</view>
        <view class="menu-item" @tap="goCard">会员卡</view>
        <view class="menu-item" @tap="goOrder">我的订单</view>
        <view class="menu-item" @tap="goAddress">收货地址</view>
        <view class="menu-item" @tap="goMenu">扫码点餐</view>
      </view>
    </view>
    <view v-else class="loading">加载中…</view>
  </s-layout>
</template>

<script setup>
import { ref, onShow } from 'vue';
import sheep from '@/sheep';
import RestaurantMemberApi from '@/sheep/api/restaurant/member';
import RestaurantCouponApi from '@/sheep/api/restaurant/coupon';
import RestaurantWalletApi from '@/sheep/api/restaurant/wallet';

const profile = ref(null);
const couponCount = ref(0);
const showCoupons = ref(false);
const myCoupons = ref([]);
const balance = ref(0);

onShow(async () => {
  const userId = sheep.$store('user').userInfo?.id;
  if (!userId) return;
  const bindRes = await RestaurantMemberApi.bind();
  if (bindRes.code === 0) {
    const getRes = await RestaurantMemberApi.get();
    if (getRes.code === 0) profile.value = getRes.data;
  }
  const cRes = await RestaurantCouponApi.myList(0);
  if (cRes.code === 0) {
    myCoupons.value = cRes.data || [];
    couponCount.value = myCoupons.value.length;
  }
  await loadWallet();
});

async function loadWallet() {
  // userId 由后端登录态注入，前端不传
  const res = await RestaurantWalletApi.getWallet(2);
  if (res.code === 0) balance.value = res.data?.balance || 0;
}
function couponRuleText(c) {
  if (c.type === 1) {
    const t = (c.thresholdAmount || 0) / 100;
    const d = (c.discountValue || 0) / 100;
    return t > 0 ? `满${t}元减${d}元` : `无门槛减${d}元`;
  }
  if (c.type === 2) {
    return `${c.discountValue}折`;
  }
  return '';
}
function couponStatusText(status) {
  return status === 0 ? '未使用' : status === 1 ? '已使用' : '已过期';
}
function goCoupon() {
  showCoupons.value = !showCoupons.value;
}
function goRecharge() {
  sheep.$router.redirect('/pages/restaurant/recharge');
}
function goOrder() {
  sheep.$router.redirect('/pages/restaurant/order-list');
}
function goMenu() {
  sheep.$router.redirect('/pages/restaurant/menu');
}
function goAddress() {
  sheep.$router.go('/pages/restaurant/address-list');
}
function goCard() {
  sheep.$router.go('/pages/restaurant/member-card');
}
</script>

<style lang="scss" scoped>
.member { padding: 20rpx; }
.header { display: flex; align-items: center; gap: 16rpx; padding: 24rpx; background: linear-gradient(135deg, #ffd666, #fa5151); border-radius: 16rpx; color: #fff; }
.nick { font-size: 34rpx; font-weight: 600; }
.level { font-size: 24rpx; background: rgba(0,0,0,0.15); padding: 4rpx 16rpx; border-radius: 20rpx; }
.stats { display: flex; margin: 20rpx 0; }
.stat { flex: 1; text-align: center; background: #fff; border-radius: 12rpx; padding: 24rpx 0; margin: 0 8rpx; }
.num { display: block; font-size: 36rpx; font-weight: 600; }
.label { font-size: 24rpx; color: #999; }
.coupon-panel { background: #fff; border-radius: 12rpx; padding: 16rpx; margin-bottom: 20rpx; }
.coupon { padding: 16rpx; border: 1rpx solid #eee; border-radius: 8rpx; margin-bottom: 12rpx; }
.c-top { display: flex; justify-content: space-between; align-items: center; }
.c-name { font-size: 28rpx; font-weight: 600; }
.c-status { font-size: 22rpx; color: #999; }
.c-rule { font-size: 24rpx; color: #fa5151; }
.empty { text-align: center; color: #999; font-size: 24rpx; padding: 20rpx 0; }
.menu { background: #fff; border-radius: 12rpx; }
.menu-item { padding: 28rpx 24rpx; border-bottom: 1rpx solid #f5f5f5; font-size: 28rpx; }
.loading { text-align: center; color: #999; padding: 120rpx 0; }
</style>
