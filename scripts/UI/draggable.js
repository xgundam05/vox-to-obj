function draggable(el, limit, handle){
  this.el = el;
  this.handle = handle || el;
  this.limit = limit || false;
  this.ready = false;
  this.offset = {
    x: 0, y: 0
  };

  this.handle.addEventListener(
    'mousedown',
    this.startMove.bind(this));
  this.handle.addEventListener(
    'mouseup',
    this.stopMove.bind(this));
  window.addEventListener(
    'mousemove',
    this.moving.bind(this));
}

draggable.prototype = {
  startMove: function(e){
    if (e.which == 1){
      this.ready = true;
      this.offset.x = e.pageX - this.el.offsetLeft;
      this.offset.y = e.pageY - this.el.offsetTop;
    }
  },
  stopMove: function(e){
    if (e.which == 1)
      this.ready = false;
  },
  moving: function(e){
    if (this.ready && e.which == 1){
      var top = e.pageY - this.offset.y;
      var left = e.pageX - this.offset.x;

      if (this.limit){
        if (this.el.offsetWidth + left > window.innerWidth)
          left = window.innerWidth - this.el.offsetWidth;
        else if (left < 0)
          left = 0;

        if (this.el.offsetHeight + top > window.innerHeight)
          top = window.innerHeight - this.el.offsetHeight;
        else if (top < 0)
          top = 0;
      }

      this.el.style.top = top + 'px';
      this.el.style.left = left + 'px';
    }
  }
};
