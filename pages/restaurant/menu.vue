<template>
  <s-layout title="扫码点餐">
    <view class="restaurant-menu">
      <!-- 门店 / 桌台信息：扫码进入时由 onLoad 解析 scene 得到 -->
      <view class="store-bar" v-if="storeId">
        <text>门店 #{{ storeId }}</text>
        <text v-if="tableId"> · 桌台 #{{ tableId }}</text>
        <text class="scan-btn" @tap="scanCode">扫桌码</text>
      </view>
      <view class="store-bar empty" v-else>
        <text>未识别到门店</text>
        <text class="scan-btn" @tap="scanCode">扫桌码点餐</text>
      </view>

      <!-- 门店轮播图（M-29）：后台「餐饮管理-轮播图」配置，仅展示启用项，按 sort 倒序 -->
      <swiper
        v-if="banners.length"
        class="banner"
        :indicator-dots="banners.length > 1"
        indicator-color="rgba(255,255,255,0.6)"
        indicator-active-color="#fa5151"
        autoplay
        circular
        :interval="4000"
      >
        <swiper-item v-for="b in banners" :key="b.id" @tap="onBannerTap(b)">
          <image class="banner-img" :src="b.image" mode="aspectFill" />
        </swiper-item>
      </swiper>

      <view class="layout">
        <!-- 左侧分类 -->
        <scroll-view class="cats" scroll-y>
          <view
            v-for="c in categories"
            :key="c.id"
            class="cat-item"
            :class="{ active: activeCat === c.id }"
            @tap="activeCat = c.id"
          >
            {{ c.name }}
          </view>
        </scroll-view>

        <!-- 右侧菜品 -->
        <scroll-view class="dishes" scroll-y>
          <view v-for="d in filteredDishes" :key="d.id" class="dish-card">
            <image class="pic" :src="d.image" mode="aspectFill" />
            <view class="info">
              <text class="name">{{ d.name }}</text>
              <text class="price">¥{{ (d.price / 100).toFixed(2) }}</text>
              <view class="qty">
                <button size="mini" @tap.stop="minus(d)">-</button>
                <text>{{ cartCountOf(d.id) }}</text>
                <button size="mini" @tap.stop="plus(d)">+</button>
              </view>
            </view>
          </view>
          <view v-if="!filteredDishes.length" class="empty">该分类暂无菜品</view>
        </scroll-view>
      </view>

      <!-- 底部购物车结算条 -->
      <view class="cart-bar" v-if="totalCount > 0">
        <text>已选 {{ totalCount }} 件 · ¥{{ (totalPrice / 100).toFixed(2) }}</text>
        <button type="primary" @tap="goConfirm">去结算</button>
      </view>
    </view>

    <!-- 规格/加料选择弹层 -->
    <view v-if="specVisible" class="spec-mask" @tap="closeSpec">
      <view class="spec-sheet" @tap.stop>
        <view class="spec-title">{{ currentDish?.name }}</view>

        <block v-if="groupedSpecs.length">
          <view class="spec-group" v-for="(grp, gi) in groupedSpecs" :key="gi">
            <text class="grp-name">{{ grp.groupName }}</text>
            <view class="opts">
              <view
                v-for="s in grp.options"
                :key="s.id"
                class="opt"
                :class="{ on: pickedSpecId === s.id }"
                @tap="pickedSpecId = s.id"
              >
                <text>{{ s.optionName }}</text>
                <text v-if="s.priceDelta" class="delta">+¥{{ (s.priceDelta / 100).toFixed(2) }}</text>
              </view>
            </view>
          </view>
        </block>

        <view class="spec-group" v-if="currentDish?.addons && currentDish.addons.length">
          <text class="grp-name">加料（可多选）</text>
          <view class="opts">
            <view
              v-for="a in currentDish.addons"
              :key="a.id"
              class="opt"
              :class="{ on: pickedAddonIds.includes(a.id) }"
              @tap="toggleAddon(a.id)"
            >
              <text>{{ a.optionName }}</text>
              <text v-if="a.priceDelta" class="delta">+¥{{ (a.priceDelta / 100).toFixed(2) }}</text>
            </view>
          </view>
        </view>

        <view class="spec-footer">
          <text class="spec-total">¥{{ (specLinePrice / 100).toFixed(2) }}</text>
          <button type="primary" @tap="confirmSpec">加入购物车</button>
        </view>
      </view>
    </view>
  </s-layout>
</template>

<script setup>
import { ref, reactive, computed, onLoad } from 'vue';
import sheep from '@/sheep';
import RestaurantDishApi from '@/sheep/api/restaurant/dish';
import RestaurantBannerApi from '@/sheep/api/restaurant/banner';

const storeId = ref(null);
const tableId = ref(null);
const activeCat = ref(null);
const categories = ref([]);
const dishes = ref([]);
const banners = ref([]);
// 购物车：每个元素是一个「菜品 + 规格/加料组合」的独立行
const cartList = reactive([]);

const filteredDishes = computed(() =>
  dishes.value.filter((d) => activeCat.value == null || d.categoryId === activeCat.value)
);
const totalCount = computed(() => cartList.reduce((s, c) => s + c.quantity, 0));
const totalPrice = computed(() => cartList.reduce((s, c) => s + c.linePrice * c.quantity, 0));

function cartCountOf(dishId) {
  return cartList.filter((c) => c.dishId === dishId).reduce((s, c) => s + c.quantity, 0);
}

// ========== 规格选择弹层 ==========
const specVisible = ref(false);
const currentDish = ref(null);
const pickedSpecId = ref(null);
const pickedAddonIds = ref([]);

const groupedSpecs = computed(() => {
  const d = currentDish.value;
  if (!d || !d.specs) return [];
  const map = {};
  d.specs.forEach((s) => {
    if (!map[s.groupName]) map[s.groupName] = { groupName: s.groupName, options: [] };
    map[s.groupName].options.push(s);
  });
  return Object.values(map);
});

const specLinePrice = computed(() => {
  const d = currentDish.value;
  if (!d) return 0;
  let p = d.price || 0;
  const spec = d.specs?.find((s) => s.id === pickedSpecId.value);
  if (spec) p += spec.priceDelta || 0;
  pickedAddonIds.value.forEach((aid) => {
    const a = d.addons?.find((x) => x.id === aid);
    if (a) p += a.priceDelta || 0;
  });
  return p;
});

function plus(d) {
  if (d.specs?.length || d.addons?.length) {
    openSpec(d);
  } else {
    addToCart(d, null, []);
  }
}
function minus(d) {
  const idx = cartList.findIndex((c) => c.dishId === d.id);
  if (idx >= 0) {
    cartList[idx].quantity -= 1;
    if (cartList[idx].quantity <= 0) cartList.splice(idx, 1);
  }
}
function openSpec(d) {
  currentDish.value = d;
  pickedSpecId.value = d.specs && d.specs.length ? d.specs[0].id : null;
  pickedAddonIds.value = [];
  specVisible.value = true;
}
function closeSpec() {
  specVisible.value = false;
}
function toggleAddon(id) {
  const i = pickedAddonIds.value.indexOf(id);
  if (i >= 0) pickedAddonIds.value.splice(i, 1);
  else pickedAddonIds.value.push(id);
}
function confirmSpec() {
  addToCart(currentDish.value, pickedSpecId.value, [...pickedAddonIds.value]);
  specVisible.value = false;
}
function addToCart(d, specId, addonIds) {
  const list = addonIds || [];
  const spec = specId != null ? d.specs?.find((s) => s.id === specId) : null;
  const addonNames = list.map((aid) => d.addons?.find((x) => x.id === aid)?.optionName).filter(Boolean);
  const specDesc = spec ? `${spec.groupName}:${spec.optionName}` : '';
  const addonDesc = addonNames.length ? '加料:' + addonNames.join('、') : '';
  let unitPrice = d.price || 0;
  if (spec) unitPrice += spec.priceDelta || 0;
  const addonPrice = list.reduce((s, aid) => {
    const a = d.addons?.find((x) => x.id === aid);
    return s + (a?.priceDelta || 0);
  }, 0);
  const key = `${d.id}_${specId}_${list.join(',')}`;
  const exist = cartList.find((c) => c.key === key);
  if (exist) {
    exist.quantity += 1;
  } else {
    cartList.push({
      key,
      dishId: d.id,
      name: d.name,
      image: d.image,
      specId: specId ?? null,
      addonIds: list,
      specDesc,
      addonDesc,
      unitPrice,
      addonPrice,
      quantity: 1,
      linePrice: unitPrice + addonPrice,
    });
  }
}
function goConfirm() {
  const items = cartList.map((c) => ({
    dishId: c.dishId,
    name: c.name,
    image: c.image,
    specId: c.specId,
    addonIds: c.addonIds,
    quantity: c.quantity,
    unitPrice: c.unitPrice,
    addonPrice: c.addonPrice,
  }));
  const total = cartList.reduce((s, c) => s + c.linePrice * c.quantity, 0);
  // 透传到确认订单页（含规格/加料快照与总价，供预览；后端下单时会按 dishId 重新计价）
  sheep.$router.redirect('/pages/restaurant/order-confirm', {
    storeId: storeId.value,
    tableId: tableId.value,
    type: 1,
    items: JSON.stringify(items),
    totalPrice: String(total),
  });
}

onLoad((options) => {
  // 扫码进入：小程序码 scene 形如 storeId=1&tableId=12
  if (options.scene) {
    const params = decodeURIComponent(options.scene)
      .split('&')
      .reduce((o, kv) => {
        const [k, v] = kv.split('=');
        o[k] = v;
        return o;
      }, {});
    storeId.value = params.storeId ? Number(params.storeId) : null;
    tableId.value = params.tableId ? Number(params.tableId) : null;
  } else {
    storeId.value = options.storeId ? Number(options.storeId) : null;
    tableId.value = options.tableId ? Number(options.tableId) : null;
  }
  loadData();
});

// 主动扫码落座：识别桌码（URL 或纯路径均可）
function scanCode() {
  uni.scanCode({
    success: (res) => {
      try {
        const txt = res.result || '';
        const qs = txt.includes('?') ? txt.split('?')[1] : txt;
        const params = qs.split('&').reduce((o, kv) => {
          const idx = kv.indexOf('=');
          if (idx > -1) o[kv.slice(0, idx)] = decodeURIComponent(kv.slice(idx + 1));
          return o;
        }, {});
        if (params.storeId) storeId.value = Number(params.storeId);
        if (params.tableId) tableId.value = Number(params.tableId);
        loadData();
        uni.showToast({ title: '已扫描桌码', icon: 'none' });
      } catch (e) {
        uni.showToast({ title: '二维码无法识别', icon: 'none' });
      }
    },
  });
}

async function loadData() {
  const [cRes, dRes] = await Promise.all([
    RestaurantDishApi.getCategoryList(),
    RestaurantDishApi.getDishSimpleList(),
  ]);
  if (cRes.code === 0) {
    categories.value = cRes.data || [];
    if (categories.value.length) activeCat.value = categories.value[0].id;
  }
  if (dRes.code === 0) dishes.value = dRes.data || [];
  // 轮播图单独拉取，失败时静默降级，绝不影响点餐主流程
  loadBanners();
}

async function loadBanners() {
  try {
    const res = await RestaurantBannerApi.getBannerList();
    if (res.code === 0) banners.value = res.data || [];
    else banners.value = [];
  } catch (e) {
    banners.value = [];
  }
}

// linkType: 1 菜品 2 门店 3 外链
function onBannerTap(b) {
  if (!b || !b.linkType || !b.linkValue) return;
  if (b.linkType === 3) {
    // 外链：$router.go 识别 http 前缀会自动走 webview（H5 端直接跳转）
    sheep.$router.go(b.linkValue);
    return;
  }
  if (b.linkType === 1) {
    // 菜品：切到该菜品所属分类，帮用户直接定位
    const dish = dishes.value.find((d) => String(d.id) === String(b.linkValue));
    if (dish) activeCat.value = dish.categoryId;
    return;
  }
  // linkType 2（门店）：MVP 阶段 C 端无门店详情页，暂不跳转
}
</script>

<style lang="scss" scoped>
.restaurant-menu { height: 100%; display: flex; flex-direction: column; }
.store-bar { padding: 16rpx 24rpx; background: #fff7e6; color: #d48806; font-size: 24rpx; display: flex; align-items: center; gap: 12rpx; }
.store-bar.empty { background: #fffbe6; }
.scan-btn { margin-left: auto; color: #fa5151; border: 1rpx solid #fa5151; border-radius: 30rpx; padding: 4rpx 20rpx; font-size: 24rpx; }
.layout { flex: 1; display: flex; overflow: hidden; }
.cats { width: 180rpx; background: #f7f7f7; }
.cat-item { padding: 28rpx 12rpx; text-align: center; font-size: 26rpx; color: #666; }
.cat-item.active { background: #fff; color: #fa5151; font-weight: 600; }
.dishes { flex: 1; padding: 16rpx; }
.dish-card { display: flex; padding: 16rpx; background: #fff; border-radius: 12rpx; margin-bottom: 16rpx; }
.pic { width: 140rpx; height: 140rpx; border-radius: 8rpx; background: #eee; }
.info { flex: 1; margin-left: 16rpx; display: flex; flex-direction: column; justify-content: space-between; }
.name { font-size: 28rpx; font-weight: 600; }
.price { color: #fa5151; font-size: 28rpx; }
.qty { display: flex; align-items: center; gap: 16rpx; }
.cart-bar { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; background: #fff; border-top: 1rpx solid #eee; }
.empty { text-align: center; color: #999; padding: 80rpx 0; }

/* 轮播图（M-29） */
.banner { height: 260rpx; margin: 16rpx 24rpx 0; border-radius: 12rpx; overflow: hidden; }
.banner-img { width: 100%; height: 100%; display: block; }

.spec-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 50; display: flex; align-items: flex-end; }
.spec-sheet { width: 100%; background: #fff; border-radius: 20rpx 20rpx 0 0; padding: 28rpx; max-height: 80vh; overflow-y: auto; }
.spec-title { font-size: 32rpx; font-weight: 700; margin-bottom: 20rpx; }
.spec-group { margin-bottom: 24rpx; }
.grp-name { font-size: 26rpx; color: #333; font-weight: 600; display: block; margin-bottom: 12rpx; }
.opts { display: flex; flex-wrap: wrap; gap: 16rpx; }
.opt { padding: 12rpx 24rpx; border: 1rpx solid #ddd; border-radius: 40rpx; font-size: 26rpx; color: #666; display: flex; align-items: center; gap: 8rpx; }
.opt.on { border-color: #fa5151; color: #fa5151; background: #fff7f7; }
.opt .delta { font-size: 22rpx; color: #fa5151; }
.spec-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 12rpx; border-top: 1rpx solid #f0f0f0; padding-top: 20rpx; }
.spec-total { font-size: 36rpx; font-weight: 700; color: #fa5151; }
</style>
