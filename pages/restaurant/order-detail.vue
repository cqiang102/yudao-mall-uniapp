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
      <!-- C-13 A：外卖单展示配送信息（收货信息 + 骑手/状态/达达配送单号） -->
      <view class="card" v-if="order.type === 3">
        <view class="row"><text>收货人</text><text>{{ order.receiverName || '—' }} {{ order.receiverPhone || '' }}</text></view>
        <view class="row addr"><text>收货地址</text><text>{{ order.receiverAddress || '—' }}</text></view>
        <view class="row" v-if="order.deliveryFee"><text>配送费</text><text>¥{{ (order.deliveryFee / 100).toFixed(2) }}</text></view>
        <block v-if="order.deliveryOrder">
          <view class="row"><text>配送状态</text><text class="dstatus">{{ deliveryStatusText }}</text></view>
          <view class="row" v-if="order.deliveryOrder.dmName">
            <text>配送骑手</text><text>{{ order.deliveryOrder.dmName }} {{ order.deliveryOrder.dmMobile || '' }}</text>
          </view>
          <view class="row" v-if="order.deliveryOrder.dadaOrderId">
            <text>配送单号</text>
            <view class="dno-row">
              <text class="dno">{{ order.deliveryOrder.dadaOrderId }}</text>
              <text class="dbtn" @tap="copyDeliveryNo">复制</text>
            </view>
          </view>
          <view class="dtip" v-if="order.deliveryOrder.dadaOrderId" @tap="queryDelivery">
            在「达达快送」小程序中用此单号可查看骑手实时位置 ›
          </view>
        </block>
        <view class="dtip" v-else>骑手接单后可查看配送进度</view>
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
import { ref, computed } from 'vue';
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app';
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

// C-13 A：配送状态（与后端 DeliveryServiceImpl 的本地映射一致：
// 0待发单 1待接单 2待取货 3配送中 4已完成 5已取消 8追加待接单 9返回中）
const deliveryMap = {
  0: '待发单', 1: '等待骑手接单', 2: '骑手已取货', 3: '配送中',
  4: '已送达', 5: '已取消', 8: '追加待接单', 9: '返回中',
};
const deliveryStatusText = computed(
  () => deliveryMap[order.value?.deliveryOrder?.status] || '配送中'
);

// 降级方案：当前未接达达开放平台（无 key），故不做轨迹查询，
// 改为「复制单号 + 引导到达达官方小程序查询」。
function copyDeliveryNo() {
  const no = order.value?.deliveryOrder?.dadaOrderId;
  if (!no) return false;
  uni.setClipboardData({
    data: no,
    success: () => uni.showToast({ title: '配送单号已复制', icon: 'none' }),
  });
  return true;
}

function queryDelivery() {
  if (!copyDeliveryNo()) return;
  uni.showModal({
    title: '查询配送进度',
    content: '配送单号已复制。打开「达达快送」微信小程序，粘贴单号即可查看骑手实时位置。',
    showCancel: false,
    confirmText: '知道了',
  });
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
.addr { align-items: flex-start; }
.addr text:last-child { max-width: 68%; text-align: right; word-break: break-all; }
.dstatus { color: #07c160; }
.dno-row { display: flex; align-items: center; }
.dno { font-size: 24rpx; color: #666; word-break: break-all; }
.dbtn { margin-left: 12rpx; color: #576b95; font-size: 24rpx; flex-shrink: 0; }
.dtip { font-size: 22rpx; color: #999; padding-top: 10rpx; }
</style>
