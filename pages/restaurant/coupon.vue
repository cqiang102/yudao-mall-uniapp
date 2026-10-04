<template>
  <s-layout title="我的优惠券">
    <view class="coupon-page">
      <!-- 状态筛选 -->
      <view class="tabs">
        <view
          v-for="t in tabs"
          :key="t.value"
          class="tab"
          :class="{ active: status === t.value }"
          @tap="switchTab(t.value)"
        >
          {{ t.label }}
        </view>
      </view>

      <!-- 券列表 -->
      <view class="list">
        <view class="item" v-for="c in list" :key="c.id" :class="{ disabled: c.status !== 0 }">
          <view class="left">
            <block v-if="c.type === 2">
              <text class="val">{{ (c.discountValue / 10).toFixed(1) }}<text class="unit">折</text></text>
            </block>
            <block v-else>
              <text class="val"><text class="unit">¥</text>{{ fen2yuan(c.discountValue) }}</text>
            </block>
            <text class="cond">{{ condText(c) }}</text>
          </view>
          <view class="mid">
            <text class="name">{{ c.name }}</text>
            <text class="code">券码 {{ c.code }}</text>
            <text class="exp">{{ expireText(c) }}</text>
          </view>
          <view class="right">
            <text class="badge" :class="'s' + c.status">{{ statusText(c.status) }}</text>
          </view>
        </view>

        <view v-if="!list.length" class="empty">
          <text>暂无{{ tabs.find((t) => t.value === status)?.label }}优惠券</text>
        </view>
      </view>

      <view class="tip">优惠券由门店发放；下单结算时可选择使用（每单限用 1 张）。</view>
    </view>
  </s-layout>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app';
import RestaurantCouponApi from '@/sheep/api/restaurant/coupon';

// 2026-10-04 新增：消费端此前没有优惠券页面（后端有 /member/coupon/my-list
// 与 /claim，前端也有 API 封装，但用户看不到自己的券、也没有入口）。
const tabs = [
  { label: '未使用', value: 0 },
  { label: '已使用', value: 1 },
  { label: '已过期', value: 2 },
];

const status = ref(0);
const list = ref([]);

onLoad(() => {
  loadList();
});

onPullDownRefresh(async () => {
  await loadList();
  uni.stopPullDownRefresh();
});

function switchTab(v) {
  if (status.value === v) return;
  status.value = v;
  loadList();
}

async function loadList() {
  const res = await RestaurantCouponApi.myList(status.value);
  list.value = res.code === 0 && Array.isArray(res.data) ? res.data : [];
}

/** 分 → 元（去掉多余的 .00） */
function fen2yuan(fen) {
  const n = Number(fen || 0) / 100;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** 使用门槛文案 */
function condText(c) {
  const th = Number(c.thresholdAmount || 0);
  if (th <= 0) return '无门槛';
  return `满 ¥${fen2yuan(th)} 可用`;
}

function statusText(s) {
  return s === 1 ? '已使用' : s === 2 ? '已过期' : '未使用';
}

/** 有效期文案（expireTime 为毫秒时间戳） */
function expireText(c) {
  const fmt = (ts) => {
    const d = new Date(Number(ts));
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  if (c.status === 1 && c.usedTime) return `使用于 ${fmt(c.usedTime)}`;
  if (c.expireTime) return `有效期至 ${fmt(c.expireTime)}`;
  return '';
}
</script>

<style lang="scss" scoped>
.coupon-page {
  padding: 20rpx;
  min-height: 100vh;
}
.tabs {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}
.tab {
  flex: 1;
  text-align: center;
  padding: 18rpx 0;
  background: #fff;
  border-radius: 40rpx;
  font-size: 26rpx;
  color: #666;
}
.tab.active {
  color: #fff;
  background: #ff3000;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
}
.item.disabled {
  opacity: 0.55;
}
.left {
  width: 170rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-right: 1rpx dashed #eee;
}
.val {
  color: #ff3000;
  font-size: 44rpx;
  font-weight: 600;
}
.unit {
  font-size: 24rpx;
}
.cond {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}
.mid {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 20rpx;
  gap: 6rpx;
}
.name {
  font-size: 28rpx;
  color: #222;
}
.code,
.exp {
  font-size: 22rpx;
  color: #999;
}
.right {
  width: 100rpx;
  text-align: right;
}
.badge {
  font-size: 22rpx;
  color: #999;
}
.badge.s1 {
  color: #bbb;
}
.badge.s2 {
  color: #bbb;
}
.empty {
  padding: 120rpx 0;
  text-align: center;
  color: #999;
  font-size: 26rpx;
}
.tip {
  margin-top: 30rpx;
  font-size: 22rpx;
  color: #999;
  line-height: 1.6;
}
</style>
