<template>
  <s-layout title="门店工作台">
    <!-- 顶部操作条 -->
    <view class="topbar">
      <view class="scan-btn" @tap="startVerify">📷 扫码核销</view>
      <view class="logout-btn" @tap="doLogout">退出</view>
    </view>

    <!-- 状态 Tab -->
    <view class="tabs">
      <view
        v-for="t in tabs"
        :key="t.value"
        class="tab-item"
        :class="{ active: currentTab === t.value }"
        @tap="switchTab(t.value)"
      >
        {{ t.label }}
      </view>
    </view>

    <!-- 订单列表 -->
    <view class="list">
      <view v-for="o in list" :key="o.id" class="order-card">
        <view class="top">
          <text class="order-no">#{{ o.orderNo }}<text v-if="o.pickupNo" class="pickup"> 取餐号 {{ o.pickupNo }}</text></text>
          <text class="status" :class="'st-' + o.status">{{ statusText(o.status) }}</text>
        </view>
        <view class="items" v-if="o.items && o.items.length">
          <text class="item-line" v-for="it in o.items" :key="it.id">
            {{ it.dishName }}×{{ it.quantity }}
          </text>
        </view>
        <view class="remark" v-if="o.remark">备注：{{ o.remark }}</view>
        <view class="receiver" v-if="o.type === 3 && o.receiverName">
          {{ o.receiverName }} {{ o.receiverPhone }} {{ o.receiverAddress }}
        </view>
        <view class="mid">
          <text>{{ typeText(o.type) }} · {{ o.createTime }}</text>
          <text class="price">¥{{ ((o.payPrice || o.totalPrice || 0) / 100).toFixed(2) }}</text>
        </view>
        <view class="actions" v-if="actionsOf(o).length">
          <view
            v-for="act in actionsOf(o)"
            :key="act.key"
            class="act-btn"
            :class="act.danger ? 'danger' : 'primary'"
            @tap="doAction(act, o)"
          >
            {{ act.label }}
          </view>
        </view>
      </view>
      <view v-if="!list.length && !loading" class="empty">暂无订单</view>
      <view v-if="loading" class="empty">加载中...</view>
      <view v-else-if="finished && list.length" class="empty">没有更多了</view>
    </view>

    <!-- H5 核销码手动输入 -->
    <view v-if="verifyInputVisible" class="mask" @tap="verifyInputVisible = false">
      <view class="dialog" @tap.stop>
        <view class="dialog-title">输入核销码</view>
        <input v-model="verifyCodeInput" class="ipt" placeholder="顾客出示的核销码" placeholder-class="ph" />
        <view class="dialog-btns">
          <button class="dlg-btn" @tap="verifyInputVisible = false">取消</button>
          <button class="dlg-btn primary" @tap="confirmVerify">核销</button>
        </view>
      </view>
    </view>
  </s-layout>
</template>

<script setup>
import { ref, onLoad, onPullDownRefresh, onReachBottom } from 'vue';
import StoreWorkApi from '@/sheep/api/restaurant/store-work';
import { isStoreLogin, storeLogout } from '@/sheep/request/store-request';

// 状态枚举与后端 OrderStatusEnum 对齐：1待支付 2已支付 3制作中 4已完成 5已取消 6退款中 7已退款
const statusMap = { 1: '待支付', 2: '已支付', 3: '制作中', 4: '已完成', 5: '已取消', 6: '退款中', 7: '已退款' };
const typeMap = { 1: '堂食', 2: '自取', 3: '外卖' };
const statusText = (s) => statusMap[s] || '未知';
const typeText = (t) => typeMap[t] || '堂食';

const tabs = [
  { label: '待支付', value: 1 },
  { label: '待接单', value: 2 },
  { label: '制作中', value: 3 },
  { label: '已完成', value: 4 },
  { label: '全部', value: 0 },
];
const currentTab = ref(2); // 默认看「待接单」
const list = ref([]);
const loading = ref(false);
const finished = ref(false);
const pageNo = ref(1);
const PAGE_SIZE = 20;

// 核销
const verifyInputVisible = ref(false);
const verifyCodeInput = ref('');

onLoad(() => {
  if (!isStoreLogin()) {
    uni.reLaunch({ url: '/pages/restaurant/store-login' });
    return;
  }
  load(true);
});

onPullDownRefresh(async () => {
  await load(true);
  uni.stopPullDownRefresh();
});

onReachBottom(() => {
  if (!finished.value && !loading.value) load(false);
});

function switchTab(v) {
  if (currentTab.value === v) return;
  currentTab.value = v;
  load(true);
}

async function load(reset) {
  loading.value = true;
  if (reset) {
    pageNo.value = 1;
    finished.value = false;
  }
  const params = { pageNo: pageNo.value, pageSize: PAGE_SIZE };
  if (currentTab.value !== 0) params.status = currentTab.value;
  const res = await StoreWorkApi.getOrderPage(params);
  loading.value = false;
  if (res.code !== 0) return;
  const rows = res.data?.list || [];
  list.value = reset ? rows : list.value.concat(rows);
  finished.value = rows.length < PAGE_SIZE;
  if (!finished.value) pageNo.value += 1;
}

// 各状态可用操作（key 对应 StoreWorkApi 方法；confirm 为二次确认文案）
function actionsOf(o) {
  switch (o.status) {
    case 1:
      return [
        { key: 'payCash', label: '现金收讫' },
        { key: 'cancel', label: '取消订单', danger: true, confirm: '确认取消该订单？' },
      ];
    case 2:
      return [
        { key: 'accept', label: '接单' },
        { key: 'refund', label: '退款', danger: true, confirm: '确认退款？金额将原路退回' },
      ];
    case 3:
      return [
        { key: 'complete', label: '完成' },
        { key: 'call', label: '叫号' },
      ];
    default:
      return [];
  }
}

async function doAction(act, o) {
  if (act.confirm) {
    const { confirm } = await uni.showModal({ title: '提示', content: act.confirm });
    if (!confirm) return;
  }
  if (act.key === 'refund') {
    // 退款填原因（可跳过）
    const { confirm: go, inputValue } = await uni.showModal({
      title: '退款原因（可留空）',
      editable: true,
      placeholderText: '如：顾客取消',
    });
    if (!go) return;
    const res = await StoreWorkApi.refund(o.id, inputValue || undefined);
    if (res.code === 0) load(true);
    return;
  }
  const res = await StoreWorkApi[act.key](o.id);
  if (res.code === 0) load(true);
}

// 扫码核销：小程序扫码，H5 手动输入
function startVerify() {
  // #ifdef MP-WEIXIN
  uni.scanCode({
    success: async (res) => {
      const codeStr = res.result || '';
      if (!codeStr) return;
      const r = await StoreWorkApi.verify(codeStr);
      if (r.code === 0) load(true);
    },
    fail: () => {
      // 用户取消扫码 → 降级为手动输入
      verifyInputVisible.value = true;
    },
  });
  // #endif
  // #ifndef MP-WEIXIN
  verifyInputVisible.value = true;
  // #endif
}

async function confirmVerify() {
  const codeStr = verifyCodeInput.value.trim();
  if (!codeStr) {
    uni.showToast({ title: '请输入核销码', icon: 'none' });
    return;
  }
  const r = await StoreWorkApi.verify(codeStr);
  if (r.code === 0) {
    verifyInputVisible.value = false;
    verifyCodeInput.value = '';
    load(true);
  }
}

function doLogout() {
  uni.showModal({
    title: '提示',
    content: '确认退出门店工作台？',
    success: (r) => {
      if (r.confirm) storeLogout();
    },
  });
}
</script>

<style lang="scss" scoped>
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
}
.scan-btn {
  padding: 12rpx 28rpx;
  background: #fff;
  border: 1rpx solid #eee;
  border-radius: 32rpx;
  font-size: 26rpx;
}
.logout-btn {
  padding: 12rpx 28rpx;
  font-size: 26rpx;
  color: #999;
}
.tabs {
  display: flex;
  background: #fff;
  padding: 0 12rpx;
  position: sticky;
  top: 0;
  z-index: 10;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 22rpx 0;
  font-size: 28rpx;
  color: #666;
  border-bottom: 4rpx solid transparent;
  &.active {
    color: #fa5151;
    font-weight: 600;
    border-bottom-color: #fa5151;
  }
}
.list {
  padding: 20rpx;
}
.order-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}
.top {
  display: flex;
  justify-content: space-between;
  font-size: 26rpx;
  color: #999;
}
.order-no {
  color: #333;
  font-weight: 500;
}
.pickup {
  color: #fa5151;
  margin-left: 8rpx;
}
.status {
  &.st-1 { color: #ff9800; }
  &.st-2 { color: #fa5151; }
  &.st-3 { color: #2979ff; }
  &.st-4 { color: #07c160; }
}
.items {
  margin-top: 12rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx 20rpx;
}
.item-line {
  font-size: 28rpx;
  color: #333;
}
.remark {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #ff9800;
}
.receiver {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #666;
}
.mid {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
  font-size: 24rpx;
  color: #999;
}
.price {
  color: #fa5151;
  font-size: 30rpx;
  font-weight: 600;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #f5f5f5;
}
.act-btn {
  padding: 10rpx 30rpx;
  border-radius: 30rpx;
  font-size: 26rpx;
  &.primary {
    color: #fff;
    background: #fa5151;
  }
  &.danger {
    color: #666;
    background: #f5f5f5;
  }
}
.empty {
  text-align: center;
  color: #999;
  padding: 100rpx 0;
  font-size: 26rpx;
}
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
}
.dialog {
  width: 600rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx;
}
.dialog-title {
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 30rpx;
}
.ipt {
  height: 80rpx;
  padding: 0 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
}
.ph {
  color: #bbb;
}
.dialog-btns {
  display: flex;
  gap: 24rpx;
  margin-top: 36rpx;
}
.dlg-btn {
  flex: 1;
  height: 76rpx;
  line-height: 76rpx;
  background: #f5f5f5;
  color: #666;
  font-size: 28rpx;
  border-radius: 38rpx;
  &::after {
    border: none;
  }
  &.primary {
    background: #fa5151;
    color: #fff;
  }
}
</style>
