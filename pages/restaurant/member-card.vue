<template>
  <s-layout title="会员卡">
    <view class="card-page">
      <!-- 余额条 -->
      <view class="wallet-bar">
        <text>可用余额</text>
        <text class="balance">¥{{ (balance / 100).toFixed(2) }}</text>
        <text class="recharge-link" @tap="goRecharge">去充值</text>
      </view>

      <!-- 在售卡列表 -->
      <view class="sec-title">在售卡</view>
      <view v-for="c in cards" :key="c.id" class="card-item">
        <view class="card-top">
          <text class="card-name">{{ c.name }}</text>
          <text class="card-price">¥{{ (c.price / 100).toFixed(2) }}</text>
        </view>
        <text v-if="c.description" class="card-desc">{{ c.description }}</text>
        <view v-if="rightsOf(c).length" class="rights">
          <text v-for="(r, i) in rightsOf(c)" :key="i" class="right-item">· {{ r }}</text>
        </view>
        <view class="card-foot">
          <text class="sold">已售 {{ c.soldCount || 0 }}</text>
          <button size="mini" type="warn" @tap="buy(c)">余额购买</button>
        </view>
      </view>
      <view v-if="!cards.length" class="empty">暂无在售会员卡</view>

      <!-- 我的购买记录 -->
      <view class="sec-title">我的购卡记录</view>
      <view v-for="r in records" :key="r.id" class="record">
        <view class="r-left">
          <text class="r-name">{{ r.cardName }}</text>
          <text class="r-time">{{ r.paidTime || r.createTime }}</text>
        </view>
        <view class="r-right">
          <text class="r-price">¥{{ (r.price / 100).toFixed(2) }}</text>
          <text class="r-status">{{ r.status === 1 ? '已支付' : '待支付' }}</text>
        </view>
      </view>
      <view v-if="!records.length" class="empty">暂无购卡记录</view>
    </view>
  </s-layout>
</template>

<script setup>
import { ref, onShow } from 'vue';
import sheep from '@/sheep';
import RestaurantCardApi from '@/sheep/api/restaurant/card';
import RestaurantWalletApi from '@/sheep/api/restaurant/wallet';

const cards = ref([]);
const records = ref([]);
const balance = ref(0);

onShow(async () => {
  load();
  loadWallet();
});

async function load() {
  const [cRes, rRes] = await Promise.all([
    RestaurantCardApi.getOnSaleList(),
    RestaurantCardApi.getMyRecords(1, 20),
  ]);
  if (cRes.code === 0) cards.value = cRes.data || [];
  if (rRes.code === 0) records.value = rRes.data?.list || [];
}

async function loadWallet() {
  try {
    const res = await RestaurantWalletApi.getWallet(2);
    if (res.code === 0) balance.value = res.data?.balance || 0;
  } catch (e) {
    balance.value = 0;
  }
}

// 权益说明按行拆分展示
function rightsOf(c) {
  return (c.rights || '').split('\n').map((s) => s.trim()).filter(Boolean);
}

function buy(c) {
  uni.showModal({
    title: '确认购买',
    content: `使用余额 ¥${(c.price / 100).toFixed(2)} 购买「${c.name}」？`,
    success: async (res) => {
      if (!res.confirm) return;
      const r = await RestaurantCardApi.buy(c.id);
      if (r.code === 0) {
        uni.showToast({ title: '购买成功', icon: 'success' });
        load();
        loadWallet();
      }
    },
  });
}

function goRecharge() {
  sheep.$router.go('/pages/restaurant/recharge');
}
</script>

<style lang="scss" scoped>
.card-page { padding: 20rpx; }
.wallet-bar { display: flex; align-items: center; gap: 16rpx; background: linear-gradient(135deg, #ffd666, #fa5151); border-radius: 16rpx; padding: 28rpx 24rpx; color: #fff; }
.balance { font-size: 36rpx; font-weight: 700; }
.recharge-link { margin-left: auto; font-size: 24rpx; background: rgba(0,0,0,0.18); padding: 6rpx 20rpx; border-radius: 24rpx; }
.sec-title { font-size: 28rpx; font-weight: 600; margin: 32rpx 0 16rpx; }
.card-item { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.card-top { display: flex; justify-content: space-between; align-items: center; }
.card-name { font-size: 30rpx; font-weight: 600; }
.card-price { color: #fa5151; font-size: 32rpx; font-weight: 700; }
.card-desc { display: block; font-size: 24rpx; color: #999; margin-top: 8rpx; }
.rights { display: flex; flex-direction: column; gap: 4rpx; margin-top: 12rpx; }
.right-item { font-size: 24rpx; color: #666; }
.card-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid #f5f5f5; }
.sold { font-size: 22rpx; color: #999; }
.record { display: flex; justify-content: space-between; align-items: center; background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; }
.r-left { display: flex; flex-direction: column; gap: 6rpx; }
.r-name { font-size: 28rpx; font-weight: 600; }
.r-time { font-size: 22rpx; color: #999; }
.r-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6rpx; }
.r-price { font-size: 28rpx; color: #fa5151; }
.r-status { font-size: 22rpx; color: #67c23a; }
.empty { text-align: center; color: #999; font-size: 24rpx; padding: 40rpx 0; }
</style>
