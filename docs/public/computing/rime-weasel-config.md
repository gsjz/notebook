# Rime 与小狼毫配置

`default.custom.yaml` 调整输入方案及默认输入行为，`weasel.custom.yaml` 调整 Windows 小狼毫的前端显示。配置是否生效，取决于字段由谁读取、补丁合并结果、当前方案及实际运行版本。YAML 能被解析只是第一步。

下文保留简体拼音、左右 Shift 切换、水平候选窗和 Windows 11 风格皮肤这一组配置。源码行为以 **Weasel 0.17.4** 与 **librime 1.17.0** 为对照；两者是分别核对的代码版本，不代表所有小狼毫安装包都恰好采用这一组合。

## 配置层次与部署

| 文件 | 主要作用 | 典型字段 |
| --- | --- | --- |
| `default.custom.yaml` | 对默认配置打补丁，为方案提供默认行为 | `schema_list`、`menu/page_size`、`ascii_composer/*` |
| `<schema>.custom.yaml` | 对特定输入方案打补丁 | 方案自身的词典、处理器和局部选项 |
| `weasel.custom.yaml` | 小狼毫前端显示和行为 | `show_notifications*`、`style/*`、`preset_color_schemes/*` |

用户补丁放在小狼毫的用户文件夹中，通过“重新部署”合并到实际使用的配置。不要直接修改安装目录的默认文件或 `build/` 中的生成结果来保存长期定制；升级和重新部署可能覆盖它们。排错时可读取生成配置，确认补丁是否进入目标字段。

方案自己的配置可能覆盖默认值，部分前端选项还可按应用定制。因此，排查顺序应为：确认当前方案与版本，确认修改的用户目录，再检查补丁路径、部署日志和生成结果，最后观察具体应用中的表现。

## `default.custom.yaml`：输入行为

```yaml title="default.custom.yaml"
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

`patch` 下的斜杠表示配置路径。例如 `menu/page_size` 修改 `menu` 内的 `page_size`。同一个 YAML 映射中的键必须保持唯一；分次粘贴补丁时尤其容易误建第二个 `patch` 或同名子项。

### 方案与候选页

`schema_list` 只列出 `luna_pinyin_simp`，表示可选方案列表只保留该方案；它需要已经安装且能成功部署。候选方案列表与“每次启动都强制重置当前输入状态”是不同问题，不能由该字段推断全部状态都会恢复默认。

`menu/page_size: 5` 将默认候选页大小设为五项。若当前方案另有覆盖，应检查方案生成配置中的最终值；不能仅凭默认文件中出现该项就认定它实际生效。

### 切换键与组合状态

`ascii_composer` 负责 ASCII 模式切换。下表说明与这套配置直接相关的动作：

| 动作 | 对照源码的处理 | 使用时的含义 |
| --- | --- | --- |
| `commit_text` | 对正在组合的内容调用 `ConfirmCurrentSelection()` | 确认当前候选；分段输入时需结合后续处理器判断是否已完成整段提交 |
| `commit_code` | `ClearNonConfirmedComposition()` 后调用 `Commit()` | 清理尚未确认的转换结果，并按当前组合与编码状态提交 |
| `noop` | 不为该键建立 ASCII 模式切换动作 | 其他处理器或应用仍可能处理这个按键 |
| `clear` | 清空当前组合内容 | 切换时放弃尚未提交内容 |

`commit_code` 中的“清理组合”并不等于删除全部原始输入。原有已确认片段和未确认编码可能经过不同路径提交，因此排查应同时观察最终上屏文本与模式状态。仅凭动作名很难判断复杂分段输入的结果。

librime 还支持 `inline_ascii`、`set_ascii_mode`、`unset_ascii_mode` 等动作；Caps Lock 的绑定有额外限制。在对照版本中，把 Caps Lock 绑定到 `inline_ascii`、`set_ascii_mode` 或 `unset_ascii_mode` 会退回 `clear`。不要假定每个动作都适用于所有切换键。

### 重复键

下面是应避免的写法：

```yaml title="重复键反例，勿直接部署"
patch:
  ascii_composer/switch_key:
    Shift_L: noop
  ascii_composer/switch_key:
    Shift_L: commit_text
```

YAML 映射要求键唯一。有的解析器报错，有的保留一份值；不能把“后写覆盖前写”当成跨解析器保证，也不能用 Python 解析器的行为替代 Rime 部署结果。应将它合并为前面的单个 `ascii_composer/switch_key` 映射。

### Caps Lock 行为

`ascii_composer/good_old_caps_lock: false` 让 Caps Lock 由 ASCII 切换逻辑处理，减少传统大写锁定行为的介入；设为 `true` 时，相关按键事件可继续传递以切换系统 Caps Lock 状态。具体按键状态还经过前端适配，验证时应同时看输入模式提示、系统锁定状态和实际字符输出。

## `weasel.custom.yaml`：窗口外观

```yaml title="weasel.custom.yaml"
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

### 通知与预编辑

`show_notifications: false` 控制通常的状态通知，`show_notifications_time: 0` 将通知显示时长设为零。两项作用相关，但源码中的通知入口并非全部相同：例如部署消息具有单独路径。保留两项可明确表达“不显示通知”的意图，排错时可暂时恢复显示以观察部署或模式变化。

在对照版本中，通知默认时长为 1200 ms。`display_tray_icon` 控制托盘图标，`horizontal` 选择水平候选布局。`inline_preedit` 请求把预编辑内容放在应用输入位置；最终效果还取决于应用的文本服务支持、方案和按应用覆盖配置，不能仅理解为候选窗“跟着光标移动”。

### 颜色主题

将下面的字段合并进同一个 `weasel.custom.yaml` 的 `patch` 中：

```yaml
  preset_color_schemes/win11:
    name: "Windows 11"
    author: "custom"
    color_format: argb
    back_color: 0xFFF9F9F9
    border_color: 0xFFE5E5E5
    shadow_color: 0x1A000000
```

`style/color_scheme: win11` 选择主题名，`preset_color_schemes/win11` 提供同名主题定义。`color_format: argb` 表示颜色依次使用透明度、红、绿、蓝通道；若从其他前端复制颜色值，必须检查其通道顺序。

这是一组局部颜色设置。候选文字、高亮文字、标签和注释还具有各自的颜色字段；若背景已经变亮但文字不可读，应检查最终主题的文字颜色及其回退值，而不要只调整透明度。

### 布局与参数耦合

下面的字段同样合并进已有 `patch`：

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

`margin_x`、`margin_y` 控制背景边界与内容之间的留白；`spacing` 控制预编辑与候选区域等元素间距；`candidate_spacing` 控制候选项间距。`hilite_padding_x/y` 为高亮内容保留空间，可能使最终间距大于直接配置的值。

在 Weasel 0.17.4 的读取代码中，`round_corner` 是 `hilited_corner_radius` 的兼容名称，对应高亮区域圆角；`corner_radius` 对应背景面板圆角。若未单独设置后者，会回退读取 `round_corner`。原例显式写了两项，因此应分别观察面板与选中项的形状。

代码还会修正过小的留白和间距，避免高亮区与相邻内容重叠。横排和竖排的修正规则不完全相同，窗口效果还受字体、DPI 和应用文本大小影响。调整时一次只改同一类参数，并同时测试短候选、长候选及多行预编辑。

### 标签与候选正文

旧配置中可能出现：

```yaml
  style/candidate_format: "%c %s"
```

在对照的 Weasel 0.17.4 样式读取实现中，标签与标记使用 `style/label_format` 和 `style/mark_text`；未发现该读取路径处理 `style/candidate_format`。这项判断限于所检查的版本与代码路径，不应推广为所有 Rime 前端的通用结论。

例如，若希望显示带点号的序号，可在同一个 `patch` 中使用：

```yaml
  style/label_format: "%s."
```

候选正文、注释和标签分别渲染，标签格式不负责重新拼接整行候选文本。需要高亮标记时再检查 `style/mark_text`，并与当前皮肤共同验证。

## 验证记录

部署成功后，至少检查以下状态；它们比单独确认“窗口变了”更容易定位问题：

| 操作 | 观察对象 |
| --- | --- |
| 无组合文本时按左右 Shift | 是否切换 ASCII 模式，是否被应用快捷键截获 |
| 输入未确认编码后按 Shift 或 Caps Lock | 上屏的是候选、原始编码还是混合片段；组合区是否保留 |
| 切换方案后输入 | 候选页大小是否仍为五项，是否存在方案覆盖 |
| 在不同应用内输入 | 行内预编辑是否有差异，字体与 DPI 是否改变布局 |
| 临时恢复通知后重新部署 | 部署是否成功，生成配置是否包含目标字段 |

仅调整界面和切换键时，备份与回退可按以下步骤进行：

1. 从小狼毫菜单打开用户文件夹，将将要编辑的 `.custom.yaml` 复制到带日期的独立备份目录，记录小狼毫版本与当前方案名。
2. 每次修改一组字段并重新部署，检查生成配置及上表中的对应行为。
3. 需要回退时恢复该补丁文件，再重新部署；保留用户词典和词频数据。

完整迁移输入习惯还需按官方同步或词典导出流程处理用户数据，不能把两个补丁文件当成全部输入法备份。配置与生成产物、用户词典分别保存不同状态，排错时应只恢复相关部分。

## 参考

- [Rime 定制指南](https://github.com/rime/home/wiki/CustomizationGuide)
- [Weasel 0.17.4：配置读取与前端行为](https://github.com/rime/weasel/blob/0.17.4/RimeWithWeasel/RimeWithWeasel.cpp)
- [Weasel 0.17.4：更新记录](https://github.com/rime/weasel/blob/0.17.4/CHANGELOG.md)
- [librime 1.17.0：AsciiComposer](https://github.com/rime/librime/blob/1.17.0/src/rime/gear/ascii_composer.cc)
- [librime 1.17.0：Context](https://github.com/rime/librime/blob/1.17.0/src/rime/context.cc)
- [YAML 1.2.2：映射与键唯一性](https://yaml.org/spec/1.2.2/)
