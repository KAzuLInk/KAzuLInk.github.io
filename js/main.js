/* ============================================================
   KAzuLink · 交互脚本
   ============================================================ */

// 1. AOS 滚动动画初始化（与闲居同款）
if (window.AOS) {
  AOS.init({
    duration: 700,
    easing: 'ease-out-cubic',
    once: true,
    offset: 80
  });
}

// 2. 顶部导航：滚动后由透明变白
const nav = document.getElementById('headNav');
const toTop = document.getElementById('toTop');

function onScroll() {
  const y = window.scrollY || document.documentElement.scrollTop;
  if (nav) {
    nav.classList.toggle('solid', y > 40);
  }
  if (toTop) {
    toTop.classList.toggle('show', y > 400);
  }
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// 3. 返回顶部
if (toTop) {
  toTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// 4. 波纹效果（Materialize waves 简化实现）
document.addEventListener('click', (e) => {
  const target = e.target.closest('.waves-effect');
  if (!target) return;

  const rect = target.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const ripple = document.createElement('span');
  ripple.className = 'wave-ripple';
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
  ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
  target.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
});

// 5. 右侧分类抽屉：点击把手也可以开合（保留 hover 展开）
const drawer = document.getElementById('categoryDrawer');
const handle = document.getElementById('drawerHandle');
if (drawer && handle) {
  handle.addEventListener('click', () => {
    drawer.classList.toggle('open');
  });
  // 点击抽屉内分类项后，若为手动展开则收起
  drawer.querySelectorAll('.drawer-item').forEach((item) => {
    item.addEventListener('click', () => {
      drawer.classList.remove('open');
    });
  });
}

// 6. 锚点跳转兜底：从其它页面带 #hash 跳转时，
//    确保目标分类区块立即可见（不被 AOS 初始隐藏卡住）
(function handleHash() {
  const hash = window.location.hash;
  if (!hash) return;
  const target = document.querySelector(hash);
  if (!target) return;
  target.classList.add('aos-animate');
  target.style.opacity = '1';
  target.style.transform = 'none';
})();
