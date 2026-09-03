<template>
  <s-layout title="会员储值">
    <view class="recharge">
      <view class="balance-card">
        <text class="label">储值余额</text>
        <text class="num">¥{{ (balance / 100).toFixed(2) }}</text>
      </view>

      <view class="section-title">选择充值金额</view>
      <view class="plans">
        <view
          v-for="p in plans"
          :key="p.pay"
          class="plan"
          :class="{ active: !customMode && selectedPay === p.pay }"
          @tap="selectPlan(p)"
        >
          <text class="pay">¥{{ (p.pay / 100).toFixed(0) }}</text>
          <text class="gift" v-if="p.gift > 0">赠¥{{ (p.gift / 100).toFixed(0) }}</text>
        </view>
      </view>

      <view class="custom">
        <text class="custom-label">自定义金额（元）</text>
        <input
          class="custom-input"
          type="digit"
          v-model="customAmount"
          @input="onCustomInput"
          placeholder="0"
        />
      </view>

      <button class="submit" type="primary" :disabled="!canRecharge" @tap="doRecharge">
        立即充值 ¥{{ payYuan }}
      </button>

      <view class="section-title">充值记录</view>
      <view v-if="records.length" class="records">
        <view v-for="r in records" :key="r.id" class="rec">
          <view class="rec-left">
            <text class="rec-amt">
              充¥{{ (r.payAmount / 100).toFixed(2) }}
              <text v-if="r.giftAmount > 0" class="rec-gift"> 赠¥{{ (r.giftAmount / 100).toFixed(2) }}</text>
            </text>
            <text class="rec-time">{{ formatTime(r.createTime) }}</text>
          </view>
          <text class="rec-status" :class="{ ok: r.status === 1 }">
            {{ r.status === 1 ? '已到账' : '待支付' }}
          </text>
        </view>
      </view>
      <view v-else class="empty">暂无充值记录</view>
    </view>
  </s-layout>
</template>

<script setup>
import { ref, computed, onShow } from 'vue';
import sheep from '@/sheep';
import { appKey } from '@/sheep/config';
import RestaurantWalletApi from '@/sheep/api/restaurant/wallet';

const USER_TYPE = 2; // 芋道 UserTypeEnum.MEMBER

const balance = ref(0);
const plans = [
  { pay: 5000, gift: 0 },
  { pay: 20000, gift: 2000 },
  { pay: 50000, gift: 6000 },
  { pay: 100000, gift: 15000 },
];
const selectedPay = ref(20000);
const customMode = ref(false);
const customAmount = ref('');

const payAmount = computed(() => {
  if (customMode.value) {
    const yuan = parseFloat(customAmount.value || '0');
    return isNaN(yuan) ? 0 : Math.round(yuan * 100);
  }
  return selectedPay.value;
});
const payYuan = computed(() => (payAmount.value / 100).toFixed(2));
const canRecharge = computed(() => payAmount.value > 0);

const records = ref([]);

function selectPlan(p) {
  customMode.value = false;
  selectedPay.value = p.pay;
}
function onCustomInput() {
  customMode.value = true;
}

function formatTime(t) {
  if (!t) return '';
  const d = new Date(t);
  if (isNaN(d.getTime())) return String(t);
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function loadWallet() {
  // userId 由后端登录态注入，前端不传
  const res = await RestaurantWalletApi.getWallet(USER_TYPE);
  if (res.code === 0) balance.value = res.data?.balance || 0;
}

async function loadRecords() {
  const userId = sheep.$store('user').userInfo?.id;
  if (!userId) return;
  const res = await RestaurantWalletApi.getRechargePage({ pageNo: 1, pageSize: 20 });
  if (res.code === 0) records.value = res.data?.list || [];
}

async function doRecharge() {
  const userId = sheep.$store('user').userInfo?.id;
  if (!userId) {
    sheep.$helper.toast('请先登录');
    return;
  }
  if (!canRecharge.value) return;
  const plan = plans.find((p) => p.pay === selectedPay.value);
  const gift = customMode.value || !plan ? 0 : plan.gift;

  // userId 由后端登录态注入，前端不传
  const createRes = await RestaurantWalletApi.createRecharge({
    userType: USER_TYPE,
    appKey,
    payAmount: payAmount.value,
    giftAmount: gift,
  });
  if (createRes.code !== 0) {
    sheep.$helper.toast(createRes.msg || '创建充值单失败');
    return;
  }
  const payRes = await RestaurantWalletApi.payRecharge(createRes.data);
  if (payRes.code !== 0) {
    sheep.$helper.toast(payRes.msg || '支付失败');
    return;
  }
  sheep.$helper.toast('充值成功');
  loadWallet();
  loadRecords();
}

onShow(() => {
  loadWallet();
  loadRecords();
});
</script>

<style lang="scss" scoped>
.recharge { padding: 20rpx; }
.balance-card {
  display: flex; flex-direction: column; gap: 8rpx;
  background: linear-gradient(135deg, #ffd666, #fa5151);
  border-radius: 16rpx; color: #fff; padding: 40rpx 32rpx; margin-bottom: 24rpx;
}
.balance-card .label { font-size: 26rpx; opacity: 0.9; }
.balance-card .num { font-size: 56rpx; font-weight: 700; }
.section-title { font-size: 28rpx; color: #666; margin: 24rpx 8rpx 16rpx; }
.plans { display: flex; flex-wrap: wrap; gap: 16rpx; }
.plan {
  width: calc(50% - 8rpx); box-sizing: border-box;
  border: 2rpx solid #eee; border-radius: 12rpx; padding: 28rpx 0; text-align: center;
  background: #fff;
}
.plan.active { border-color: #fa5151; background: #fff5f5; }
.plan .pay { display: block; font-size: 38rpx; font-weight: 600; }
.plan .gift { display: block; font-size: 24rpx; color: #fa5151; margin-top: 6rpx; }
.custom { display: flex; align-items: center; gap: 16rpx; margin: 16rpx 0; background: #fff; border-radius: 12rpx; padding: 20rpx 24rpx; }
.custom-label { font-size: 26rpx; color: #666; }
.custom-input { flex: 1; text-align: right; font-size: 30rpx; }
.submit { margin: 24rpx 0; background: #fa5151; }
.records { background: #fff; border-radius: 12rpx; padding: 8rpx 24rpx; }
.rec { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.rec-left { display: flex; flex-direction: column; gap: 6rpx; }
.rec-amt { font-size: 28rpx; font-weight: 600; }
.rec-gift { color: #fa5151; font-weight: 400; font-size: 24rpx; }
.rec-time { font-size: 22rpx; color: #999; }
.rec-status { font-size: 24rpx; color: #fa8c16; }
.rec-status.ok { color: #52c41a; }
.empty { text-align: center; color: #999; font-size: 24rpx; padding: 40rpx 0; }
</style>
