# 小狼毫配置杂谈

这篇只看两份 YAML：`default.custom.yaml` 和 `weasel.custom.yaml`。前者主要改输入行为，后者主要改小狼毫窗口外观。两者表面上都叫“输入法配置”，实际分别落到 librime 和 Weasel 两层代码里。

## 两份 YAML 的分工

| 文件 | 主要层次 | 典型字段 |
| --- | --- | --- |
| `default.custom.yaml` | librime / schema 侧 | `schema_list`、`menu/page_size`、`ascii_composer/*` |
| `weasel.custom.yaml` | Weasel UI 侧 | `show_notifications*`、`style/*`、`preset_color_schemes/*` |

!!! note "先分层，再看字段"
    `default.custom.yaml` 里的很多内容，只有在 librime 的 schema 里才有意义；`weasel.custom.yaml` 里的很多内容，只会被 Weasel 的窗口渲染代码读到。把两层混在一起看，很容易把“键写对了”误判成“效果一定生效了”。

## `default.custom.yaml`：输入行为

```yaml
patch:
  schema_list:
    - {schema: luna_pinyin_simp}

  ascii_composer/switch_key:
    Caps_Lock: commit_code
    Shift_L: commit_text
    Shift_R: commit_text
    Control_L: noop
    Control_R: noop

  ascii_composer/good_old_caps_lock: false
  menu/page_size: 5
```

### `schema_list`

`schema_list` 只留下 `luna_pinyin_simp`，意思很直接：启动时把简体拼音作为默认方案。这个部分走的是 librime 的 schema 配置，不是 Weasel UI。

### `menu/page_size`

`menu/page_size: 5` 是候选页每页显示 5 个。librime 侧默认值本来也是 5，源码里没有看到它的特殊逻辑，更多是一个显式声明，方便后续改成 7、9 之类。

### `ascii_composer/switch_key`

这里最关键的是出现了两段同名键：

```yaml
  ascii_composer/switch_key:
    Caps_Lock: commit_code
    Shift_L: noop
    Shift_R: noop

  ascii_composer/switch_key:
    Caps_Lock: commit_code
    Shift_L: commit_text
    Shift_R: commit_text
    Control_L: noop
    Control_R: noop
```

在常见 YAML 解析器里，后写的同名键会覆盖前面的值。也就是说，前一段里 `Shift_L: noop`、`Shift_R: noop` 这两行，实际会被后一段覆盖掉。最终真正生效的，是第二段。

!!! warning "重复键会把前面的配置吃掉"
这种写法可读性很差，也很容易让人以为“前一段已经生效”。实际上，在常见 YAML 解析器里，同名键最后只保留一份；本地用 PyYAML 读取这份文件时，也是后一段覆盖前一段。这个文件里，建议把 `ascii_composer/switch_key` 合并成一段。

#### 这几个动作在源码里分别做什么

Rime 的 `AsciiComposer` 在 `src/rime/gear/ascii_composer.cc` 里把动作名映射成枚举：

- `inline_ascii`
- `commit_text`
- `commit_code`
- `clear`
- `set_ascii_mode`
- `unset_ascii_mode`
- `noop`

对应到这份配置里，最重要的是这三个：

- `commit_text`：调用 `ConfirmCurrentSelection()`。它更像“先把当前候选确认下来”，不是强行清空整段输入。
- `commit_code`：先 `ClearNonConfirmedComposition()`，再 `Commit()`。这条路径更激进，目的是把未确认部分清掉，再把当前编码收口。
- `noop`：不建立这个键的 ASCII 切换绑定，按键本身不会被这层逻辑接管。

还有一个细节值得记住：`Caps_Lock` 不能被绑定成 `inline_ascii`、`set_ascii_mode` 或 `unset_ascii_mode`，源码里会把这类非法组合降级成 `clear`。

### `good_old_caps_lock`

`ascii_composer/good_old_caps_lock: false` 的意思是，Caps Lock 更偏向“输入法切换键”，而不是保留传统的大写锁定行为。Weasel / librime 这一路代码里，`false` 时会更直接地拦住 Caps 状态的旧式用法。

## `weasel.custom.yaml`：窗口外观

```yaml
patch:
  show_notifications: false
  show_notifications_time: 0

  style/color_scheme: win11
  style/horizontal: true
  style/inline_preedit: true
  style/display_tray_icon: false

  style/font_face: "Microsoft YaHei UI"
  style/font_point: 13
  style/label_font_face: "Microsoft YaHei UI"
  style/label_font_point: 11
  style/comment_font_face: "Microsoft YaHei UI"
  style/comment_font_point: 11
```

### 通知、托盘和预编辑

- `show_notifications: false` 和 `show_notifications_time: 0` 都是在关切换提示。
- `style/display_tray_icon: false` 关掉托盘图标。
- `style/inline_preedit: true` 让预编辑尽量跟着光标走。
- `style/horizontal: true` 选水平候选窗。

Weasel 的源码里，`show_notifications_time` 默认是 `1200ms`，`0` 会直接让提示不显示。`inline_preedit`、`display_tray_icon` 这些字段也是 Weasel 自己读的，不归 librime 管。

### 颜色主题

```yaml
  preset_color_schemes/win11:
    name: "Windows 11"
    author: "custom"
    color_format: argb
    back_color: 0xFFF9F9F9
    border_color: 0xFFE5E5E5
    shadow_color: 0x1A000000
```

这段是典型的 Weasel 皮肤定义：

- `style/color_scheme: win11` 只是选中这个主题名。
- 真正的颜色定义在 `preset_color_schemes/win11` 里。
- `color_format: argb` 决定颜色字面量怎么解码。

Weasel 的读取顺序也很明确：先看 `style/color_scheme`，再去找 `preset_color_schemes/<name>`，然后把 `back_color`、`border_color`、`shadow_color`、`text_color`、`candidate_text_color`、`label_color`、`comment_text_color` 这些项灌进 UI 状态。

### 布局参数

```yaml
  style/layout/border_width: 1
  style/layout/margin_x: 12
  style/layout/margin_y: 10
  style/layout/spacing: 8
  style/layout/candidate_spacing: 16
  style/layout/hilite_spacing: 6
  style/layout/hilite_padding_x: 8
  style/layout/hilite_padding_y: 4
  style/layout/corner_radius: 8
  style/layout/round_corner: 6
  style/layout/shadow_radius: 6
  style/layout/shadow_offset_x: 0
  style/layout/shadow_offset_y: 2
  style/layout/min_width: 160
  style/layout/max_width: 520
```

这组值决定的是“窗口长什么样、字和字之间隔多远、阴影多重”。

- `margin_x` / `margin_y` 是外边距。
- `spacing` 是预编辑和候选区之间的基础间隔。
- `candidate_spacing` 是候选之间的间隔。
- `hilite_spacing` 是高亮块和邻接元素的距离。
- `hilite_padding_x` / `hilite_padding_y` 会反过来影响间距，Weasel 代码里会拿它们去兜住太小的 spacing。
- `shadow_radius` 和 `shadow_offset_x/y` 决定阴影虚化和偏移。
- `corner_radius`、`round_corner` 不是一回事，Weasel 实际上把它们拆成了两套圆角参数：一个偏高亮块，一个偏整个背景面板。

!!! tip "这套参数不是独立的"
    Weasel 代码会自动把一些值抬高到“至少不打架”的程度，比如边距不能小于高亮 padding，间隔不能小于高亮区域需要的宽度。也就是说，最后看到的效果不一定只由你写进去的那个数决定。

### 文字格式

```yaml
  style/candidate_format: "%c %s"
```

这行需要单独拎出来：在我读到的当前 Weasel 源码里，真正被 UI 读到的是 `style/label_format` 和 `style/mark_text`，不是 `style/candidate_format`。也就是说，这条更像历史遗留、别的前端字段，或者旧配置里带过来的写法。

Weasel 渲染候选时，源码里是这样做的：

- `label_text_format` 决定标签怎么显示。
- `mark_text` 决定高亮候选前面的标记。
- 候选正文、注释、标签分别走各自的文本通道。

如果目标是“候选序号怎么长、当前项怎么标出来”，优先盯 `style/label_format` 和 `style/mark_text`，而不是 `candidate_format`。

## 代码对照

主要对照了这些官方源码位置：

- [Weasel `RimeWithWeasel.cpp`](https://github.com/rime/weasel/blob/master/RimeWithWeasel/RimeWithWeasel.cpp)
- [Weasel `CHANGELOG.md`](https://github.com/rime/weasel/blob/master/CHANGELOG.md)
- [librime `ascii_composer.cc`](https://github.com/rime/librime/blob/master/src/rime/gear/ascii_composer.cc)
- [librime `context.cc`](https://github.com/rime/librime/blob/master/src/rime/context.cc)
- [librime `composition.cc`](https://github.com/rime/librime/blob/master/src/rime/composition.cc)
- [librime `engine.cc`](https://github.com/rime/librime/blob/master/src/rime/engine.cc)

### 我会优先改的地方

1. 把 `ascii_composer/switch_key` 合并成一段。
2. 如果要调候选窗标签，改 `style/label_format` 和 `style/mark_text`，别只盯 `candidate_format`。
3. `show_notifications: false` 和 `show_notifications_time: 0` 这组可以保留一个更清楚的写法。
