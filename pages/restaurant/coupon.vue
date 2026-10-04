<template>
  <s-layout title="优惠券">
    <view class="coupon-page">
      <!-- 状态筛选（首个 tab 为领券中心） -->
      <view class="tabs">
        <view
          v-for="t in tabs"
          :key="t.key"
          class="tab"
          :class="{ active: activeKey === t.key }"
          @tap="switchTab(t.key)"
        >
          {{ t.label }}
        </view>
      </view>

      <!-- ① 领券中心 -->
      <view class="list" v-if="activeKey === 'available'">
        <view class="item" v-for="c in list" :key="c.id" :class="{ disabled: !c.canClaim }">
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
            <text class="code">{{ templateLine(c) }}</text>
          </view>
          <view class="right">
            <view class="claim-btn" :class="{ disabled: !c.canClaim }" @tap="onClaim(c)">
              {{ c.canClaim ? '领取' : '已领完' }}
            </view>
          </view>
        </view>
        <view v-if="!list.length" class="empty"><text>暂无可领取的优惠券</text></view>
      </view>

      <!-- ② 我的券（未使用 / 已使用 / 已过期） -->
      <view class="list" v-else>
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
        <view v-if="!list.length" class="empty"><text>暂无{{ currentLabel }}优惠券</text></view>
      </view>

      <view class="tip">
        优惠券由门店发放，可在结算页选择使用（每单限用 1 张）。
      </view>
    </view>
  </s-layout>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app';
import RestaurantCouponApi from '@/sheep/api/restaurant/coupon';

/**
 * 2026-10-04：消费端此前既没有券页面、也没有领券入口
 * （后端有 my-list / claim，前端有 API 封装，但用户看不到也用不了）。
 * 本页 = 领券中心（可领取）+ 我的优惠券（未使用/已使用/已过期）。
 * 2026-10-04 增补：后端新增 GET /member/coupon/available-list（领券中心数据源）。
 */
const tabs = [
  { label: '可领取', key: 'available' },
  { label: '未使用', key: 'unused', status: 0 },
  { label: '已使用', key: 'used', status: 1 },
  { label: '已过期', key: 'expired', status: 2 },
];

const activeKey = ref('available');
const list = ref([]);

const currentLabel = computed(() => tabs.find((t) => t.key === activeKey.value)?.label || '');

onLoad(() => {
  loadList();
});

onPullDownRefresh(async () => {
  await loadList();
  uni.stopPullDownRefresh();
});

function switchTab(key) {
  if (activeKey.value === key) return;
  activeKey.value = key;
  loadList();
}

async function loadList() {
  if (activeKey.value === 'available') {
    const res = await RestaurantCouponApi.availableList();
    list.value = res.code === 0 && Array.isArray(res.data) ? res.data : [];
    return;
  }
  const st = tabs.find((t) => t.key === activeKey.value)?.status;
  const res = await RestaurantCouponApi.myList(st);
  list.value = res.code === 0 && Array.isArray(res.data) ? res.data : [];
}

/** 领取优惠券 → 成功后刷新（已领数 +1，可能变为不可领） */
async function onClaim(c) {
  if (!c.canClaim) {
    uni.showToast({ title: '已达限领或已领完', icon: 'none' });
    return;
  }
  const res = await RestaurantCouponApi.receive(c.id);
  if (res.code === 0) {
    await loadList();
  }
}

/** 分 → 元（整数不带小数） */
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

/** 领券中心：限领/库存说明 */
function templateLine(c) {
  const parts = [];
  parts.push(`有效期 ${c.validDays || '—'} 天`);
  if (c.perLimit && c.perLimit > 0) {
    parts.push(`每人限领 ${c.perLimit} 张（已领 ${c.claimedCount || 0}）`);
  }
  if (c.stockLeft != null) {
    parts.push(`剩 ${c.stockLeft} 张`);
  }
  return parts.join(' · ');
}

function statusText(s) {
  return s === 1 ? '已使用' : s === 2 ? '已过期' : '未使用';
}

/** 有效期 / 使用时间文案（毫秒时间戳） */
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
  gap: 12rpx;
  margin-bottom: 20rpx;
}
.tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  background: #fff;
  border-radius: 40rpx;
  font-size: 24rpx;
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
  width: 130rpx;
  text-align: right;
}
.badge {
  font-size: 22rpx;
  color: #999;
}
.badge.s1,
.badge.s2 {
  color: #bbb;
}
.claim-btn {
  display: inline-block;
  background: #ff3000;
  color: #fff;
  font-size: 24rpx;
  padding: 10rpx 28rpx;
  border-radius: 30rpx;
}
.claim-btn.disabled {
  background: #ccc;
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
