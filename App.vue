<script setup>
  import { onLaunch, onShow, onError } from '@dcloudio/uni-app';
  import { ShoproInit } from './sheep';

  onLaunch(() => {
    // 2026-10-03：原实现是 uni.hideTabBar()「隐藏原生 tabBar、改用装修配置驱动的自定义 tabBar」。
    // 餐饮端已改为使用【原生 tabBar】（pages.json 的 tabBar 指向 门店/点餐/订单/我的 四页），
    // 若继续隐藏原生 tabBar，底部导航会不出现/闪烁，故移除。
    // 若将来要恢复自定义 tabBar，需连同 pages.json 的 tabBar 配置一起改回。
    // （微信小程序的 tabBar 由原生渲染；H5 端另需 App.vue 底部那段 .uni-tabbar-border 样式修正）

    // 加载Shopro底层依赖
    ShoproInit();
  });

  onShow(() => {
    // #ifdef APP-PLUS
    // 获取urlSchemes参数
    const args = plus.runtime.arguments;
    if (args) {
    }

    // 获取剪贴板
    uni.getClipboardData({
      success: (res) => {},
    });
    // #endif
  });
</script>

<style lang="scss">
  @import '@/sheep/scss/index.scss';

  // #ifdef H5
  /* 2026-10-03：H5 端 tabBar 布局错位修正。
     现象：4 个 tab 被挤在右侧、每个只有 24px（图标宽度），左侧空出 294px。
     原因：tabBar 的顶部边框线 .uni-tabbar-border 本该 position:absolute
     （见 @dcloudio/uni-h5/style/framework/tabBar.css），
     但本版本实测 computed 为 position:relative →
     它作为 flex item 参与分配，把 390px 里的 294px 抢走，
     剩下的 96px 由 4 个 flex:1 的 tab 平分 → 每个 24px。
     实测：加 !important 覆盖后恢复正常（4 项各 98px，left=0/98/195/293）。
     影响范围：**仅 H5**。微信小程序的 tabBar 是原生渲染，不走这套 CSS。 */
  uni-tabbar .uni-tabbar-border {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    height: 1px !important;
  }
  // #endif
</style>
