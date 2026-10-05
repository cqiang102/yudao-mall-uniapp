<template>
  <s-layout :title="pageTitle">
    <!-- 历史消费（C-12） -->
    <view class="summary" v-if="type === 'consume'">
      <view class="card">
        <view class="stat">
          <text class="num">¥{{ ((summary.totalAmount || 0) / 100).toFixed(2) }}</text>
          <text class="label">累计消费</text>
        </view>
        <view class="stat">
          <text class="num">{{ summary.orderCount || 0 }}</text>
          <text class="label">订单数</text>
        </view>
      </view>
      <view class="card" v-if="summary.lastOrderTime">
        <text class="last">最近下单：{{ formatTime(summary.lastOrderTime) }}</text>
      </view>
      <view class="link" @tap="goOrders">查看全部订单 ›</view>
    </view>

    <!-- 帮助/关于列表 -->
    <view class="doc-list" v-else>
      <view v-for="d in docs" :key="d.id" class="doc-card">
        <text class="doc-title">{{ d.title }}</text>
        <text class="doc-content">{{ d.content }}</text>
      </view>
      <view v-if="!docs.length" class="empty">暂无内容</view>
    </view>
  </s-layout>
</template>

<script setup>
import { ref, computed } from 'vue';
import sheep from '@/sheep';
import RestaurantUserCenterApi from '@/sheep/api/restaurant/usercenter';
import { formatTime } from '@/sheep/helper/format';

const props = defineProps({
  // 页面类型：consume-历史消费  help-帮助  about-关于
  type: { type: String, default: 'consume' },
});

const summary = ref({});
const docs = ref([]);

const pageTitle = computed(() =>
  ({ consume: '历史消费', help: '帮助中心', about: '关于我们' }[props.type] || '用户中心'),
);

if (props.type === 'consume') {
  RestaurantUserCenterApi.getConsumeSummary().then((res) => {
    if (res.code === 0) summary.value = res.data || {};
  });
} else {
  const docType = props.type === 'about' ? 2 : 1;
  RestaurantUserCenterApi.getHelpList(docType).then((res) => {
    if (res.code === 0) docs.value = res.data || [];
  });
}

function goOrders() {
  sheep.$router.go('/pages/restaurant/order-list');
}
</script>

<style lang="scss" scoped>
.summary { padding: 20rpx; }
.card { background: #fff; border-radius: 12rpx; padding: 32rpx 24rpx; margin-bottom: 20rpx; display: flex; }
.stat { flex: 1; text-align: center; }
.num { display: block; font-size: 36rpx; font-weight: 600; color: #fa5151; }
.label { font-size: 24rpx; color: #999; }
.last { font-size: 26rpx; color: #666; }
.link { text-align: center; color: #fa5151; font-size: 28rpx; padding: 24rpx 0; }
.doc-list { padding: 20rpx; }
.doc-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.doc-title { display: block; font-size: 30rpx; font-weight: 600; margin-bottom: 12rpx; }
.doc-content { font-size: 26rpx; color: #666; white-space: pre-wrap; line-height: 1.6; }
.empty { text-align: center; color: #999; padding: 120rpx 0; }
</style>
