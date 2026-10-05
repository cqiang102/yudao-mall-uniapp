<template>
  <s-layout title="我的订单">
    <view class="tabs">
      <view
        v-for="t in tabs"
        :key="t.value"
        class="tab"
        :class="{ 'tab-on': activeType === t.value }"
        @tap="switchTab(t.value)"
      >
        {{ t.label }}
      </view>
    </view>
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
        <!-- 预约单展示预约时间（C-15） -->
        <view class="reserve" v-if="o.type === 4 && o.reserveTime">
          预约到店：{{ formatTime(o.reserveTime) }}
        </view>
        <view class="bottom">
          <text>{{ formatTime(o.createTime) }}</text>
          <view class="ops">
            <text v-if="o.status === 1" class="pay-btn" @tap.stop="pay(o)">去支付</text>
            <text
              v-if="o.status === 1"
              class="cancel-btn"
              @tap.stop="cancel(o)"
            >
              取消
            </text>
          </view>
        </view>
      </view>
      <view v-if="!list.length" class="empty">暂无订单</view>
    </view>
  </s-layout>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app';
import sheep from '@/sheep';
import { appKey } from '@/sheep/config';
import RestaurantOrderApi from '@/sheep/api/restaurant/order';
import { formatTime } from '@/sheep/helper/format';

const list = ref([]);
// 状态枚举与后端 OrderStatusEnum 对齐：1待支付 2已支付 3制作中 4已完成 5已取消 6退款中 7已退款
const statusMap = { 1: '待支付', 2: '已支付', 3: '制作中', 4: '已完成', 5: '已取消', 6: '退款中', 7: '已退款' };
const typeMap = { 1: '堂食', 2: '自取', 3: '外卖', 4: '预约' };
const statusText = (s) => statusMap[s] || '未知';
const typeText = (t) => typeMap[t] || '堂食';

// 类型筛选（C-15：预约单可单独查看）value=null 表示全部
const tabs = [
  { label: '全部', value: null },
  { label: '堂食', value: 1 },
  { label: '自取', value: 2 },
  { label: '外卖', value: 3 },
  { label: '预约', value: 4 },
];
const activeType = ref(null);
function switchTab(v) {
  activeType.value = v;
  load();
}

onLoad(() => load());
onPullDownRefresh(async () => {
  await load();
  uni.stopPullDownRefresh();
});

async function load() {
  const { code, data } = await RestaurantOrderApi.getOrderPage({
    pageNo: 1,
    pageSize: 20,
    type: activeType.value ?? undefined,
  });
  if (code === 0) list.value = data.list || [];
}
// 取消订单（未支付/已支付均可取消；后端校验归属，已支付会走退款口径时需先退款）
async function cancel(o) {
  const confirmed = await new Promise((resolve) => {
    uni.showModal({
      title: '取消订单',
      content: o.type === 4 ? '确认取消该预约？时段将释放给其他顾客。' : '确认取消该订单？',
      success: (r) => resolve(!!r.confirm),
      fail: () => resolve(false),
    });
  });
  if (!confirmed) return;
  const res = await RestaurantOrderApi.cancelOrder(o.id);
  if (res.code === 0) {
    uni.showToast({ title: '已取消', icon: 'success' });
    load();
  }
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
/* 类型筛选（C-15） */
.tabs { display: flex; padding: 0 20rpx; background: #fff; }
.tab { flex: 1; text-align: center; padding: 24rpx 0; font-size: 28rpx; color: #666; border-bottom: 4rpx solid transparent; }
.tab-on { color: #fa5151; border-bottom-color: #fa5151; }
.reserve { font-size: 24rpx; color: #fa5151; background: #fff5f5; padding: 8rpx 12rpx; border-radius: 6rpx; margin-bottom: 12rpx; }
.ops { display: flex; align-items: center; }
.cancel-btn { color: #999; border: 1rpx solid #ddd; padding: 6rpx 24rpx; border-radius: 24rpx; margin-left: 16rpx; }
.order-card { background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx; }
.top { display: flex; justify-content: space-between; font-size: 26rpx; color: #999; }
.status { color: #fa5151; }
.mid { display: flex; justify-content: space-between; padding: 12rpx 0; font-size: 28rpx; }
.price { color: #fa5151; }
.bottom { display: flex; justify-content: space-between; align-items: center; font-size: 24rpx; color: #999; }
.pay-btn { color: #fff; background: #fa5151; padding: 6rpx 24rpx; border-radius: 24rpx; }
.empty { text-align: center; color: #999; padding: 120rpx 0; }
</style>
