<template>
  <s-layout title="资讯">
    <view class="news-list">
      <view v-for="n in list" :key="n.id" class="news-card" @tap="expand(n)">
        <view class="n-top">
          <text class="n-tag" v-if="n.storeId === 0">平台</text>
          <text class="n-title">{{ n.title }}</text>
          <text class="n-time">{{ formatTime(n.createTime) }}</text>
        </view>
        <text class="n-summary" v-if="n.summary && expanded !== n.id">{{ n.summary }}</text>
        <text class="n-content" :class="{ 'n-open': expanded === n.id }">{{ n.content }}</text>
      </view>
      <view v-if="!list.length" class="empty">暂无资讯</view>
    </view>
  </s-layout>
</template>

<script setup>
import { ref } from 'vue';
import RestaurantNewsApi from '@/sheep/api/restaurant/news';
import { resolveStoreId } from '@/sheep/helper/restaurant-store';

const list = ref([]);
const expanded = ref(null);

// 2026-10-03：门店上下文改用统一兜底（本地记忆优先，没有则取门店列表第一个）。
// 原先写 `getStorageSync('restaurant-store-id') || 0`，新用户从未选过店时会传 0，
// 后端按「全平台」查 → 本店资讯一条都查不到，页面显示"暂无资讯"。
resolveStoreId()
  .then((storeId) => RestaurantNewsApi.getList(storeId))
  .then((res) => {
    if (res.code === 0) list.value = res.data || [];
  });

function expand(n) {
  expanded.value = expanded.value === n.id ? null : n.id;
}
function formatTime(t) {
  return t ? String(t).replace('T', ' ').slice(0, 10) : '';
}
</script>

<style lang="scss" scoped>
.news-list { padding: 20rpx; }
.news-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.n-top { display: flex; align-items: center; }
.n-tag { flex-shrink: 0; font-size: 20rpx; color: #1a73e8; border: 1rpx solid #1a73e8; border-radius: 6rpx; padding: 2rpx 10rpx; margin-right: 12rpx; }
.n-title { flex: 1; font-size: 30rpx; font-weight: 600; }
.n-time { font-size: 22rpx; color: #999; margin-left: 12rpx; }
.n-summary { display: block; font-size: 26rpx; color: #888; margin-top: 12rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.n-content { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; font-size: 26rpx; color: #666; margin-top: 14rpx; white-space: pre-wrap; }
.n-open { display: block; -webkit-line-clamp: unset; }
.empty { text-align: center; color: #999; padding: 120rpx 0; }
</style>
