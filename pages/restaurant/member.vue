<template>
  <s-layout title="会员中心">
    <view class="member" v-if="profile">
      <view class="header">
        <text class="nick">{{ sheep.$store('user').userInfo?.nickname || '会员' }}</text>
        <text class="level">{{ profile.levelName || '普通会员' }}</text>
      </view>
      <view class="stats">
        <view class="stat" @tap="goRecharge">
          <text class="num">¥{{ (balance / 100).toFixed(2) }}</text>
          <text class="label">储值余额</text>
        </view>
        <view class="stat">
          <text class="num">{{ (profile.pointBalance || 0) }}</text>
          <text class="label">积分</text>
        </view>
        <view class="stat">
          <text class="num">{{ (profile.growthValue || 0) }}</text>
          <text class="label">成长值</text>
        </view>
        <view class="stat" @tap="goCoupon">
          <text class="num">{{ couponCount }}</text>
          <text class="label">我的券</text>
        </view>
      </view>

      <!-- 我的券列表（内联展开） -->
      <view v-if="showCoupons" class="coupon-panel">
        <view v-for="c in myCoupons" :key="c.id" class="coupon">
          <view class="c-top">
            <text class="c-name">{{ c.name }}</text>
            <text class="c-status">{{ couponStatusText(c.status) }}</text>
          </view>
          <text class="c-rule">{{ couponRuleText(c) }}</text>
        </view>
        <view v-if="!myCoupons.length" class="empty">暂无优惠券</view>
      </view>

      <!-- 我的服务：后端可配置（M-24），接口为空/失败时回退内置默认项 -->
      <view class="menu">
        <view class="menu-item" @tap="goConsume">
          <text class="mi-icon">📊</text><text class="mi-name">历史消费</text><text class="mi-arrow">›</text>
        </view>
        <view class="menu-item" v-for="item in portalMenus" :key="item.id || item.path" @tap="goPortal(item)">
          <text class="mi-icon" v-if="item.icon">{{ item.icon }}</text>
          <text class="mi-name">{{ item.name }}</text>
          <text class="mi-arrow">›</text>
        </view>
        <view class="menu-item" @tap="showService = true">
          <text class="mi-icon">🎧</text><text class="mi-name">联系客服</text><text class="mi-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goNews">
          <text class="mi-icon">📰</text><text class="mi-name">资讯</text><text class="mi-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goNotice">
          <text class="mi-icon">📣</text><text class="mi-name">公告</text><text class="mi-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goInvoice">
          <text class="mi-icon">🧾</text><text class="mi-name">发票</text><text class="mi-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goHelp('help')">
          <text class="mi-icon">❓</text><text class="mi-name">帮助中心</text><text class="mi-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goHelp('about')">
          <text class="mi-icon">ℹ️</text><text class="mi-name">关于我们</text><text class="mi-arrow">›</text>
        </view>
      </view>

      <!-- 客服弹层（C-12）：拨号 + 复制微信 -->
      <view class="mask" v-if="showService" @tap="showService = false">
        <view class="sheet" @tap.stop>
          <text class="sheet-title">联系客服</text>
          <view class="sheet-row" @tap="callService" v-if="storeInfo.phone">
            <text>📞 电话客服：{{ storeInfo.phone }}</text>
            <text class="sheet-act">拨打</text>
          </view>
          <view class="sheet-row" @tap="copyWechat" v-if="storeInfo.serviceWechat">
            <text>💬 微信客服：{{ storeInfo.serviceWechat }}</text>
            <text class="sheet-act">复制</text>
          </view>
          <view class="sheet-empty" v-if="!storeInfo.phone && !storeInfo.serviceWechat">
            当前门店未配置客服联系方式
          </view>
          <view class="sheet-cancel" @tap="showService = false">取消</view>
        </view>
      </view>
    </view>
    <view v-else class="loading">加载中…</view>
  </s-layout>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import sheep from '@/sheep';
import RestaurantMemberApi from '@/sheep/api/restaurant/member';
import RestaurantCouponApi from '@/sheep/api/restaurant/coupon';
import RestaurantWalletApi from '@/sheep/api/restaurant/wallet';
import RestaurantPortalMenuApi from '@/sheep/api/restaurant/portalmenu';
import { getStoredStoreId, resolveStoreId } from '@/sheep/helper/restaurant-store';
import RestaurantStoreApi from '@/sheep/api/restaurant/store';

// 内置兜底：后端无配置（或接口失败）时展示，保证「我的」页永不空白
const DEFAULT_MENUS = [
  { name: '会员储值', icon: '💳', path: '/pages/restaurant/recharge' },
  { name: '会员卡', icon: '🎫', path: '/pages/restaurant/member-card' },
  { name: '我的订单', icon: '📋', path: '/pages/restaurant/order-list' },
  { name: '收货地址', icon: '📍', path: '/pages/restaurant/address-list' },
  // 积分商城：门店由该页自身兜底（sheep/helper/restaurant-store），此处不再拼参数
  { name: '积分商城', icon: '🎁', path: '/pages/restaurant/point-shop' },
];

const portalMenus = ref(DEFAULT_MENUS);

const profile = ref(null);
const couponCount = ref(0);
const showCoupons = ref(false);
const myCoupons = ref([]);
const balance = ref(0);

onShow(async () => {
  const userId = sheep.$store('user').userInfo?.id;
  if (!userId) return;
  const bindRes = await RestaurantMemberApi.bind();
  if (bindRes.code === 0) {
    const getRes = await RestaurantMemberApi.get();
    if (getRes.code === 0) profile.value = getRes.data;
  }
  const cRes = await RestaurantCouponApi.myList(0);
  if (cRes.code === 0) {
    myCoupons.value = cRes.data || [];
    couponCount.value = myCoupons.value.length;
  }
  await loadWallet();
  await loadPortalMenus();
});

// 我的服务菜单：本店优先 → 平台默认 → 内置兜底
async function loadPortalMenus() {
  // 本店菜单优先；无记忆时传 0，后端会回退到平台默认菜单（既有设计）
  const storeId = getStoredStoreId();
  try {
    const res = await RestaurantPortalMenuApi.getMemberMenuList(storeId);
    if (res.code === 0 && Array.isArray(res.data) && res.data.length) {
      portalMenus.value = res.data;
    }
  } catch (e) {
    // 静默：接口失败沿用内置默认项
  }
}
function goPortal(item) {
  if (!item?.path) return;
  // 外链走 webview，内部页面走路由
  if (item.path.startsWith('http')) {
    sheep.$router.go('/pages/public/webview', { url: item.path });
    return;
  }
  // 2026-10-03：按店隔离的页面（如积分商城）已由页面自身兜底门店，
  // 这里不再拼 storeId=0（拼 0 会让目标页按"全平台"查，查不到本店数据）
  sheep.$router.go(item.path);
}

// ========== 用户中心（C-12） ==========
const showService = ref(false);
const storeInfo = ref({});

// 进入页面时顺带拉门店客服信息（有 storeId 才拉，失败静默）
async function loadStoreService() {
  // 没选过店时用统一兜底（本地记忆 → 门店列表第一个），否则客服信息永远拉不到
  const sid = await resolveStoreId();
  if (!sid) return;
  try {
    const res = await RestaurantStoreApi.getStore(sid);
    if (res.code === 0) storeInfo.value = res.data || {};
  } catch (e) {
    // 静默
  }
}
loadStoreService();

function goConsume() {
  sheep.$router.go('/pages/restaurant/user-center?type=consume');
}
function goHelp(t) {
  sheep.$router.go(`/pages/restaurant/user-center?type=${t}`);
}
function goNotice() {
  sheep.$router.go('/pages/restaurant/notice');
}
function goNews() {
  sheep.$router.go('/pages/restaurant/news');
}
function goInvoice() {
  sheep.$router.go('/pages/restaurant/invoice');
}
function callService() {
  if (storeInfo.value.phone) uni.makePhoneCall({ phoneNumber: storeInfo.value.phone });
}
function copyWechat() {
  if (!storeInfo.value.serviceWechat) return;
  uni.setClipboardData({
    data: storeInfo.value.serviceWechat,
    success: () => uni.showToast({ title: '微信号已复制', icon: 'success' }),
  });
}

async function loadWallet() {
  // userId 由后端登录态注入，前端不传
  const res = await RestaurantWalletApi.getWallet(2);
  if (res.code === 0) balance.value = res.data?.balance || 0;
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
function couponStatusText(status) {
  return status === 0 ? '未使用' : status === 1 ? '已使用' : '已过期';
}
function goCoupon() {
  showCoupons.value = !showCoupons.value;
}
function goRecharge() {
  sheep.$router.redirect('/pages/restaurant/recharge');
}
function goOrder() {
  sheep.$router.redirect('/pages/restaurant/order-list');
}
function goMenu() {
  sheep.$router.redirect('/pages/restaurant/menu');
}
function goAddress() {
  sheep.$router.go('/pages/restaurant/address-list');
}
function goCard() {
  sheep.$router.go('/pages/restaurant/member-card');
}
</script>

<style lang="scss" scoped>
.member { padding: 20rpx; }
.header { display: flex; align-items: center; gap: 16rpx; padding: 24rpx; background: linear-gradient(135deg, #ffd666, #fa5151); border-radius: 16rpx; color: #fff; }
.nick { font-size: 34rpx; font-weight: 600; }
.level { font-size: 24rpx; background: rgba(0,0,0,0.15); padding: 4rpx 16rpx; border-radius: 20rpx; }
.stats { display: flex; margin: 20rpx 0; }
.stat { flex: 1; text-align: center; background: #fff; border-radius: 12rpx; padding: 24rpx 0; margin: 0 8rpx; }
.num { display: block; font-size: 36rpx; font-weight: 600; }
.label { font-size: 24rpx; color: #999; }
.coupon-panel { background: #fff; border-radius: 12rpx; padding: 16rpx; margin-bottom: 20rpx; }
.coupon { padding: 16rpx; border: 1rpx solid #eee; border-radius: 8rpx; margin-bottom: 12rpx; }
.c-top { display: flex; justify-content: space-between; align-items: center; }
.c-name { font-size: 28rpx; font-weight: 600; }
.c-status { font-size: 22rpx; color: #999; }
.c-rule { font-size: 24rpx; color: #fa5151; }
.empty { text-align: center; color: #999; font-size: 24rpx; padding: 20rpx 0; }
.menu { background: #fff; border-radius: 12rpx; }
.menu-item { display: flex; align-items: center; padding: 28rpx 24rpx; border-bottom: 1rpx solid #f5f5f5; font-size: 28rpx; }
.mi-icon { margin-right: 16rpx; font-size: 32rpx; }
.mi-name { flex: 1; }
.mi-arrow { color: #ccc; font-size: 32rpx; }
/* 客服弹层（C-12） */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 999; display: flex; align-items: flex-end; }
.sheet { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); }
.sheet-title { display: block; text-align: center; font-size: 30rpx; font-weight: 600; margin-bottom: 24rpx; }
.sheet-row { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid #f5f5f5; font-size: 28rpx; }
.sheet-act { color: #fa5151; }
.sheet-empty { text-align: center; color: #999; font-size: 26rpx; padding: 24rpx 0; }
.sheet-cancel { text-align: center; padding: 28rpx 0 0; font-size: 28rpx; color: #999; }
.loading { text-align: center; color: #999; padding: 120rpx 0; }
</style>
