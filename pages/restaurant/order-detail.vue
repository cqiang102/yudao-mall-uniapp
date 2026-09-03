<template>
  <s-layout title="订单详情">
    <view class="detail" v-if="order">
      <view class="status">状态：{{ statusText }}</view>
      <view class="card">
        <view class="row"><text>订单号</text><text>{{ order.orderNo }}</text></view>
        <view class="row"><text>门店</text><text>{{ order.storeId }}</text></view>
        <view class="row"><text>类型</text><text>{{ typeText }}</text></view>
        <view class="row"><text>实付</text><text class="price">¥{{ (order.payPrice / 100).toFixed(2) }}</text></view>
      </view>
      <view class="card">
        <view v-for="it in order.items" :key="it.id" class="item">
          <text>{{ it.dishName }}</text>
          <text>x{{ it.quantity }}</text>
        </view>
      </view>
      <!-- 自取/外卖：出示核销码给门店扫码核销 -->
      <view class="card verify" v-if="showVerify">
        <view class="verify-title">{{ typeText }} · 请向前台出示</view>
        <view class="verify-no" v-if="order.pickupNo">取餐号 {{ order.pickupNo }}</view>
        <view class="verify-code">{{ order.verifyCode }}</view>
        <view class="verify-tip">门店扫码或输入此核销码即可完成取餐</view>
      </view>
      <button v-if="order.status === 1" type="primary" @tap="payAgain">立即支付</button>
      <button v-if="canRefund" type="warn" @tap="applyRefund">申请退款</button>
    </view>
    <view v-else class="loading">加载中…</view>
  </s-layout>
</template>

<script setup>
import { ref, computed, onLoad, onPullDownRefresh } from 'vue';
import sheep from '@/sheep';
import { appKey } from '@/sheep/config';
import RestaurantOrderApi from '@/sheep/api/restaurant/order';

const order = ref(null);
// 状态枚举与后端 OrderStatusEnum 对齐：1待支付 2已支付 3制作中 4已完成 5已取消 6退款中 7已退款
const statusMap = { 1: '待支付', 2: '已支付', 3: '制作中', 4: '已完成', 5: '已取消', 6: '退款中', 7: '已退款' };
const typeMap = { 1: '堂食', 2: '自取', 3: '外卖' };
const statusText = computed(() => statusMap[order.value?.status] || '未知');
const typeText = computed(() => typeMap[order.value?.type] || '堂食');
// 已支付 / 制作中 / 已完成 可申请退款
const canRefund = computed(() => [2, 3, 4].includes(order.value?.status));
// 自取/外卖 且已支付或制作中：展示核销码供门店扫码核销
const showVerify = computed(() =>
  [2, 3].includes(order.value?.type) && [2, 3].includes(order.value?.status) && !!order.value?.verifyCode
);

let orderId = null;
onLoad((options) => {
  orderId = Number(options.id);
  load();
});
onPullDownRefresh(async () => {
  await load();
  uni.stopPullDownRefresh();
});

async function load() {
  const { code, data } = await RestaurantOrderApi.getOrder(orderId);
  if (code === 0) order.value = data;
}
async function payAgain() {
  // 身份由后端从登录态取（防伪造），前端只传订单号与 appKey
  await RestaurantOrderApi.payWeixin(orderId, appKey);
  load();
}
async function applyRefund() {
  const { code } = await RestaurantOrderApi.applyRefund(orderId, '用户申请退款');
  if (code === 0) load();
}
</script>

<style lang="scss" scoped>
.detail { padding: 20rpx; }
.status { font-size: 32rpx; font-weight: 600; padding: 20rpx; }
.card { background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx; }
.row { display: flex; justify-content: space-between; padding: 12rpx 0; font-size: 28rpx; }
.price { color: #fa5151; }
.item { display: flex; justify-content: space-between; padding: 10rpx 0; }
.verify { text-align: center; }
.verify-title { font-size: 26rpx; color: #888; }
.verify-no { font-size: 30rpx; font-weight: 600; margin-top: 10rpx; }
.verify-code { font-size: 64rpx; font-weight: 700; letter-spacing: 8rpx; color: #07c160; margin: 16rpx 0; }
.verify-tip { font-size: 24rpx; color: #999; }
.loading { text-align: center; color: #999; padding: 120rpx 0; }
</style>
