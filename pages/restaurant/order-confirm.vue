<template>
  <s-layout title="确认订单">
    <view class="confirm" v-if="previewItems.length">
      <!-- 订单类型 -->
      <view class="card">
        <view class="seg">
          <view
            v-for="t in typeOptions"
            :key="t.value"
            class="seg-item"
            :class="{ on: orderType === t.value }"
            @tap="switchType(t.value)"
          >{{ t.label }}</view>
        </view>
        <view class="type-tip" v-if="orderType === 1 && tableId">
          堂食 · 桌台 #{{ tableId }}
        </view>
        <view class="type-tip" v-else-if="orderType === 2">
          到店自取 · 凭订单号取餐
        </view>
      </view>

      <!-- 外卖收货信息（从地址簿选择，M-23 pick 模式回填） -->
      <view class="card" v-if="orderType === 3">
        <view class="addr-pick" @tap="pickAddress">
          <view v-if="receiver.name" class="addr-info">
            <view class="addr-row1">
              <text class="addr-name">{{ receiver.name }}</text>
              <text class="addr-phone">{{ receiver.phone }}</text>
            </view>
            <text class="addr-detail">{{ receiver.address }}</text>
          </view>
          <view v-else class="addr-empty">📍 请选择收货地址</view>
          <text class="addr-change">{{ receiver.name ? '更换 >' : '' }}</text>
        </view>
        <view class="delivery-fee" v-if="deliveryFee > 0">
          配送费 ¥{{ (deliveryFee / 100).toFixed(2) }}
          <text v-if="minOrderAmount > 0" class="min-tip">（满¥{{ (minOrderAmount / 100).toFixed(2) }}起送）</text>
        </view>
      </view>

      <!-- 订单明细 -->
      <view class="card">
        <view v-for="it in previewItems" :key="it.dishId + '_' + (it.specId || '')" class="item">
          <image class="pic" :src="it.image" mode="aspectFill" />
          <view class="meta">
            <text class="name">{{ it.name }}</text>
            <text class="sub" v-if="it.specDesc || it.addonDesc">{{ [it.specDesc, it.addonDesc].filter(Boolean).join(' / ') }}</text>
            <text class="price">¥{{ ((it.unitPrice + (it.addonPrice || 0)) / 100).toFixed(2) }}</text>
          </view>
          <text class="qty">x{{ it.quantity }}</text>
        </view>
      </view>

      <!-- 优惠券 -->
      <view class="card">
        <view class="row" @tap="showCoupons = !showCoupons">
          <text>优惠券</text>
          <text class="val">{{ selectedCoupon ? couponText(selectedCoupon) : '不使用优惠券' }}</text>
        </view>
        <view v-if="showCoupons" class="coupon-list">
          <view
            v-for="c in availableCoupons"
            :key="c.id"
            class="coupon"
            :class="{ active: selectedCoupon && selectedCoupon.id === c.id, disabled: !couponUsable(c) }"
            @tap="onPickCoupon(c)"
          >
            <text class="c-name">{{ c.name }}</text>
            <text class="c-rule">{{ couponRuleText(c) }}</text>
            <text v-if="!couponUsable(c)" class="c-tip">不满使用门槛</text>
          </view>
          <view v-if="!availableCoupons.length" class="empty">暂无可用优惠券</view>
        </view>
      </view>

      <!-- 支付方式 -->
      <view class="card">
        <view class="row" @tap="payType = 'weixin'">
          <text>微信支付</text>
          <radio :checked="payType === 'weixin'" />
        </view>
        <view class="row" @tap="payType = 'balance'" v-if="memberProfile">
          <text>余额支付（剩 ¥{{ (walletBalance / 100).toFixed(2) }}）</text>
          <radio :checked="payType === 'balance'" />
        </view>
      </view>

      <!-- 备注 -->
      <view class="card">
        <input v-model="remark" placeholder="备注（口味/忌口）" />
      </view>

      <view class="footer">
        <view class="amount">
          <text v-if="discountPrice > 0" class="discount">已优惠 ¥{{ (discountPrice / 100).toFixed(2) }}</text>
          <text class="total">合计 ¥{{ (payPrice / 100).toFixed(2) }}</text>
        </view>
        <button type="primary" @tap="submit">提交订单</button>
      </view>
    </view>
    <view v-else class="loading">加载中…</view>
  </s-layout>
</template>

<script setup>
import { ref, reactive, computed, onLoad, onUnload } from 'vue';
import sheep from '@/sheep';
import { appKey } from '@/sheep/config';
import RestaurantOrderApi from '@/sheep/api/restaurant/order';
import RestaurantStoreApi from '@/sheep/api/restaurant/store';
import RestaurantMemberApi from '@/sheep/api/restaurant/member';
import RestaurantWalletApi from '@/sheep/api/restaurant/wallet';
import RestaurantCouponApi from '@/sheep/api/restaurant/coupon';
import RestaurantAddressApi from '@/sheep/api/restaurant/address';

const submitting = ref(false);
const previewItems = ref([]);
const goodsTotal = ref(0); // 商品总价（含规格加价，不含配送费）
const storeId = ref(null);
const tableId = ref(null);
const orderType = ref(1);
const payType = ref('weixin');
const remark = ref('');
const memberProfile = ref(null);
const walletBalance = ref(0); // 会员储值余额（分），来自 /member/recharge/wallet，非会员积分
const USER_TYPE = 2; // 芋道 UserTypeEnum.MEMBER
let userId = null;

// 订单类型
const typeOptions = [
  { value: 1, label: '堂食' },
  { value: 2, label: '自取' },
  { value: 3, label: '外卖' },
];

// 外卖配送
const deliveryFee = ref(0);
const minOrderAmount = ref(0);
const receiver = reactive({ name: '', phone: '', address: '' });

// 地址簿联动（M-23 pick 模式）：跳地址簿选择 → uni.$on 回填
function pickAddress() {
  sheep.$router.go('/pages/restaurant/address-list', { pick: 1 });
}
function onAddressPicked(addr) {
  receiver.name = addr.name || '';
  receiver.phone = addr.phone || '';
  receiver.address = [addr.region, addr.detail].filter(Boolean).join(' ');
}
// 切外卖时自动带出默认地址（地址簿 defaultStatus===1 优先，否则取第一条）
async function loadDefaultAddress() {
  if (receiver.name) return;
  const res = await RestaurantAddressApi.getMyList();
  if (res.code !== 0 || !res.data?.length) return;
  const def = res.data.find((a) => a.defaultStatus === 1) || res.data[0];
  onAddressPicked(def);
}

// 优惠券
const showCoupons = ref(false);
const coupons = ref([]);
const selectedCoupon = ref(null);

const availableCoupons = computed(() =>
  coupons.value.filter((c) => c.status === 0 && (!c.expireTime || new Date(c.expireTime).getTime() > Date.now()))
);

// 含配送费的总价
const totalAmount = computed(() => goodsTotal.value + (orderType.value === 3 ? deliveryFee.value : 0));

// 折扣预览（单位：分）
const discountPrice = computed(() => {
  const c = selectedCoupon.value;
  if (!c) return 0;
  if (c.type === 1) {
    // 满减
    const threshold = c.thresholdAmount || 0;
    if (totalAmount.value < threshold) return 0;
    return c.discountValue || 0;
  }
  if (c.type === 2) {
    // 折扣：rate 如 95 表示 95 折
    const rate = c.discountValue || 100;
    if (rate <= 0 || rate >= 100) return 0;
    return Math.round((totalAmount.value * (100 - rate)) / 100);
  }
  return 0;
});
const payPrice = computed(() => Math.max(0, totalAmount.value - discountPrice.value));

async function switchType(t) {
  orderType.value = t;
  if (t === 3 && deliveryFee.value === 0) {
    await loadStore();
  }
  // 切外卖自动带出默认地址
  if (t === 3 && userId) {
    await loadDefaultAddress();
  }
}

async function loadStore() {
  if (!storeId.value) return;
  const res = await RestaurantStoreApi.getStore(storeId.value);
  if (res.code === 0 && res.data) {
    deliveryFee.value = res.data.deliveryFee || 0;
    minOrderAmount.value = res.data.minOrderAmount || 0;
  }
}

onLoad(async (options) => {
  storeId.value = options.storeId ? Number(options.storeId) : null;
  tableId.value = options.tableId ? Number(options.tableId) : null;
  orderType.value = options.type ? Number(options.type) : 1;
  previewItems.value = options.items ? JSON.parse(options.items) : [];
  goodsTotal.value = options.totalPrice ? Number(options.totalPrice) : previewItems.value.reduce(
    (s, d) => s + ((d.unitPrice || 0) + (d.addonPrice || 0)) * (d.quantity || 0), 0
  );

  userId = sheep.$store('user').userInfo?.id;
  // 确保会员档案已创建，用于下单 memberId 提交；userId 由后端登录态取，前端不传
  if (userId) {
    const bindRes = await RestaurantMemberApi.bind();
    if (bindRes.code === 0) {
      const getRes = await RestaurantMemberApi.get();
      if (getRes.code === 0) memberProfile.value = getRes.data;
    }
    await loadMyCoupons();
    await loadWallet();
  }
  // 外卖默认拉取配送费 + 默认地址
  if (orderType.value === 3) {
    await loadStore();
    if (userId) await loadDefaultAddress();
  }
  // 地址簿选择回传（onUnload 注销，防重复注册与泄漏）
  uni.$on('address-picked', onAddressPicked);
});

onUnload(() => {
  uni.$off('address-picked', onAddressPicked);
});

async function loadMyCoupons() {
  const { code, data } = await RestaurantCouponApi.myList(0);
  if (code === 0) coupons.value = data || [];
}

// 拉取真实储值余额（非会员积分），用于余额支付展示
async function loadWallet() {
  const res = await RestaurantWalletApi.getWallet(USER_TYPE);
  if (res.code === 0) walletBalance.value = res.data?.balance || 0;
}

function couponRuleText(c) {
  if (c.type === 1) {
    const t = (c.thresholdAmount || 0) / 100;
    const d = (c.discountValue || 0) / 100;
    return t > 0 ? `满${t}元减${d}元` : `无门槛减${d}元`;
  }
  if (c.type === 2) {
    return `${c.discountValue}折`;
  }
  return '';
}
function couponText(c) {
  return `${c.name}（${couponRuleText(c)}）`;
}
function couponUsable(c) {
  if (c.type === 1) {
    return totalAmount.value >= (c.thresholdAmount || 0);
  }
  return true;
}
function onPickCoupon(c) {
  if (!couponUsable(c)) {
    uni.showToast({ title: '未满使用门槛', icon: 'none' });
    return;
  }
  selectedCoupon.value = selectedCoupon.value && selectedCoupon.value.id === c.id ? null : c;
  showCoupons.value = false;
}

async function submit() {
  if (submitting.value) return;
  if (!previewItems.value.length) {
    uni.showToast({ title: '订单为空', icon: 'none' });
    return;
  }
  if (orderType.value === 3) {
    if (!receiver.name || !receiver.phone || !receiver.address) {
      uni.showToast({ title: '请选择收货地址', icon: 'none' });
      return;
    }
    if (minOrderAmount.value > 0 && goodsTotal.value < minOrderAmount.value) {
      uni.showToast({ title: '未满起送价', icon: 'none' });
      return;
    }
  }
  submitting.value = true;
  try {
    // 1) 创建订单（优惠券归属与用户归属由后端从登录态校验并算价）
    const createRes = await RestaurantOrderApi.createOrder({
      storeId: storeId.value,
      tableId: orderType.value === 1 ? tableId.value : null,
      type: orderType.value,
      memberId: memberProfile.value?.id,
      couponId: selectedCoupon.value ? selectedCoupon.value.id : null,
      remark: remark.value,
      receiverName: orderType.value === 3 ? receiver.name : null,
      receiverPhone: orderType.value === 3 ? receiver.phone : null,
      receiverAddress: orderType.value === 3 ? receiver.address : null,
      items: previewItems.value.map((d) => ({
        dishId: d.dishId,
        specId: d.specId || null,
        addonIds: d.addonIds || [],
        quantity: d.quantity,
      })),
    });
    if (createRes.code !== 0) {
      uni.showToast({ title: createRes.msg || '下单失败', icon: 'none' });
      return;
    }
    const orderId = createRes.data;

    // 2) 发起支付（身份由后端从登录态取，前端不再传 userId/memberId）
    if (payType.value === 'weixin') {
      const res = await RestaurantOrderApi.payWeixin(
        orderId,
        appKey // 见 .env SHOPRO_RESTAURANT_APP_KEY，餐饮 PayApp 的 appKey
      );
      if (res.code === 0) {
        sheep.$router.redirect('/pages/restaurant/order-detail', { id: orderId });
      } else {
        uni.showToast({ title: res.msg || '发起支付失败', icon: 'none' });
      }
    } else {
      const res = await RestaurantOrderApi.payBalance(orderId);
      if (res.code === 0) {
        sheep.$router.redirect('/pages/restaurant/order-detail', { id: orderId });
      } else {
        uni.showToast({ title: res.msg || '余额支付失败', icon: 'none' });
      }
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
.confirm { padding: 20rpx; }
.card { background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx; }
.seg { display: flex; gap: 16rpx; }
.seg-item { flex: 1; text-align: center; padding: 18rpx 0; border: 1rpx solid #ddd; border-radius: 40rpx; font-size: 28rpx; color: #666; }
.seg-item.on { border-color: #fa5151; color: #fa5151; background: #fff7f7; }
.type-tip { font-size: 24rpx; color: #999; margin-top: 12rpx; }
.row { display: flex; align-items: center; padding: 16rpx 0; }
.row .label { width: 120rpx; font-size: 28rpx; color: #333; }
.row input { flex: 1; font-size: 28rpx; }
.delivery-fee { font-size: 24rpx; color: #fa5151; margin-top: 8rpx; }
.min-tip { color: #999; }
.addr-pick { display: flex; align-items: center; justify-content: space-between; padding: 8rpx 0; }
.addr-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.addr-row1 { display: flex; align-items: center; gap: 16rpx; margin-bottom: 8rpx; }
.addr-name { font-size: 30rpx; font-weight: 600; }
.addr-phone { font-size: 26rpx; color: #666; }
.addr-detail { font-size: 26rpx; color: #666; line-height: 1.5; }
.addr-empty { flex: 1; font-size: 28rpx; color: #999; }
.addr-change { flex-shrink: 0; margin-left: 20rpx; font-size: 24rpx; color: #fa8c16; }
.item { display: flex; align-items: center; padding: 12rpx 0; font-size: 28rpx; }
.item .pic { width: 88rpx; height: 88rpx; border-radius: 8rpx; background: #eee; margin-right: 16rpx; }
.item .meta { flex: 1; display: flex; flex-direction: column; }
.item .name { font-size: 28rpx; }
.item .sub { font-size: 22rpx; color: #999; }
.item .price { color: #fa5151; font-size: 24rpx; }
.item .qty { color: #999; }
.row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; }
.row .val { color: #666; }
.coupon-list { margin-top: 12rpx; border-top: 1rpx solid #f0f0f0; padding-top: 12rpx; }
.coupon { padding: 16rpx; border: 1rpx solid #eee; border-radius: 8rpx; margin-bottom: 12rpx; display: flex; flex-direction: column; }
.coupon.active { border-color: #fa5151; background: #fff7f7; }
.coupon.disabled { opacity: 0.5; }
.coupon .c-name { font-size: 28rpx; font-weight: 600; }
.coupon .c-rule { font-size: 24rpx; color: #fa5151; }
.coupon .c-tip { font-size: 22rpx; color: #999; }
.empty { text-align: center; color: #999; font-size: 24rpx; padding: 20rpx 0; }
.footer { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 24rpx; background: #fff; border-top: 1rpx solid #eee; }
.footer .amount { display: flex; flex-direction: column; }
.footer .discount { color: #fa5151; font-size: 22rpx; }
.footer .total { font-size: 32rpx; font-weight: 700; }
.loading { text-align: center; color: #999; padding: 120rpx 0; }
</style>
