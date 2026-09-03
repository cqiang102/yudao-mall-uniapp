<template>
  <s-layout title="我的订单">
    <view class="list">
      <view v-for="o in list" :key="o.id" class="order-card" @tap="goDetail(o.id)">
        <view class="top">
          <text>订单 #{{ o.orderNo }}</text>
          <text class="status">{{ statusText(o.status) }}</text>
        </view>
        <view class="mid">
          <text>{{ typeText(o.type) }}</text>
          <text class="price">¥{{ (o.payPrice / 100).toFixed(2) }}</text>
        </view>
        <view class="bottom">
          <text>{{ o.createTime }}</text>
          <text v-if="o.status === 1" class="pay-btn" @tap.stop="pay(o)">去支付</text>
        </view>
      </view>
      <view v-if="!list.length" class="empty">暂无订单</view>
    </view>
  </s-layout>
</template>

<script setup>
import { ref, onLoad, onPullDownRefresh } from 'vue';
import sheep from '@/sheep';
import { appKey } from '@/sheep/config';
import RestaurantOrderApi from '@/sheep/api/restaurant/order';

const list = ref([]);
// 状态枚举与后端 OrderStatusEnum 对齐：1待支付 2已支付 3制作中 4已完成 5已取消 6退款中 7已退款
const statusMap = { 1: '待支付', 2: '已支付', 3: '制作中', 4: '已完成', 5: '已取消', 6: '退款中', 7: '已退款' };
const typeMap = { 1: '堂食', 2: '自取', 3: '外卖' };
const statusText = (s) => statusMap[s] || '未知';
const typeText = (t) => typeMap[t] || '堂食';

onLoad(() => load());
onPullDownRefresh(async () => {
  await load();
  uni.stopPullDownRefresh();
});

async function load() {
  const { code, data } = await RestaurantOrderApi.getOrderPage({
    pageNo: 1,
    pageSize: 20,
  });
  if (code === 0) list.value = data.list || [];
}
function goDetail(id) {
  sheep.$router.redirect('/pages/restaurant/order-detail', { id });
}
async function pay(o) {
  // 身份由后端从登录态取，前端只传订单号与 appKey（注意不要误传 userId）
  await RestaurantOrderApi.payWeixin(o.id, appKey);
  load();
}
</script>

<style lang="scss" scoped>
.list { padding: 20rpx; }
.order-card { background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx; }
.top { display: flex; justify-content: space-between; font-size: 26rpx; color: #999; }
.status { color: #fa5151; }
.mid { display: flex; justify-content: space-between; padding: 12rpx 0; font-size: 28rpx; }
.price { color: #fa5151; }
.bottom { display: flex; justify-content: space-between; align-items: center; font-size: 24rpx; color: #999; }
.pay-btn { color: #fff; background: #fa5151; padding: 6rpx 24rpx; border-radius: 24rpx; }
.empty { text-align: center; color: #999; padding: 120rpx 0; }
</style>
