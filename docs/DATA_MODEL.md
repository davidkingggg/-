# 核心数据模型 (Data Model)

> **关于归档机制：**
> 核心业务表（如供应商、报价、流程、行政事项）默认采用逻辑删除机制。为避免误删重要资料，采用 `isArchived` 和 `archivedAt` 字段进行数据归档。

## 6.1 品类表：Category
管理锅炉行业重点采购品类。
- `id`: 主键
- `name`: 品类名称
- `type`: 品类类型
- `isPriority`: 是否优先推广
- `standardLevel`: 标准化程度（高 / 中 / 低）
- `afterSalesRisk`: 售后风险（高 / 中 / 低）
- `purchaseFrequency`: 安装公司采购频率（高 / 中 / 低）
- `notes`: 备注
- `isArchived`: 是否已归档
- `archivedAt`: 归档时间
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

## 6.2 供应商表：Supplier
以“供应商 + 主品类”为主要管理单位。
- `id`: 主键
- `name`: 供应商名称
- `categoryId`: 主品类
- `region`: 所在地区
- `companyType`: 推荐标签 + 自定义输入
- `source`: 推荐标签 + 自定义输入
- `hasQuoted`: 是否已报价
- `hasVisited`: 是否已考察
- `willingToJoin`: 是否愿意入驻平台
- `cooperationWillingness`: 强 / 一般 / 弱 / 未确认
- `qualification`: 资质情况
- `deliveryAbility`: 交期能力
- `afterSalesAbility`: 售后能力
- `paymentTerms`: 账期条件
- `priceLevel`: 高 / 中 / 低 / 未知
- `recommendedLevel`: A优先推荐 / B备选 / C暂不推荐 / 未评级
- `riskSummary`: 风险点摘要
- `notes`: 备注
- `nextFollowUpDate`: 下次跟进时间
- `isArchived`: 是否已归档
- `archivedAt`: 归档时间
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

## 6.3 供应商联系人表：SupplierContact
支持一个供应商多个联系人。
- `id`: 主键
- `supplierId`: 所属供应商
- `name`: 联系人姓名
- `position`: 职务
- `phone`: 电话
- `wechat`: 微信
- `email`: 邮箱
- `isPrimary`: 是否主要联系人
- `notes`: 备注
- `isArchived`: 是否已归档
- `archivedAt`: 归档时间
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

## 6.4 内部人员表：Person
用于管理内部和相关人员。
- `id`: 主键
- `name`: 姓名
- `department`: 部门
- `role`: 角色（如：总经理助理 / 老板 / 销售 / 商务 / 工程师 / 采购需求提交人 / 行政 / 其他）
- `phone`: 电话
- `email`: 邮箱
- `notes`: 备注
- `isActive`: 是否在用
- `user`: 可选绑定的登录账号（1 对 1）
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

## 6.5 报价单表：QuoteSheet
用于记录一次报价来源。
- `id`: 主键
- `quoteNumber`: 报价单编号（可空，唯一；用于 CSV 导入时按编号合并明细）
- `title`: 报价单名称（可空；用于显示标识）
- `supplierId`: 供应商
- `categoryId`: 品类
- `quoteDate`: 报价日期
- `sourceType`: 微信 / 图片 / PDF / Excel / 口头 / 其他
- `quoteStage`: 初次报价 / 二次议价 / 最终确认价 / 量大优惠价
- `rawText`: 原始报价说明
> 注：QuoteSheet 不再保留 filePath 字段。所有报价文件、资质文件、合同文件、发票文件、考察照片等，都统一进入 Attachment 表。
- `notes`: 备注
- `isArchived`: 是否已归档
- `archivedAt`: 归档时间
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

## 6.6 报价明细表：QuoteItem
用于结构化报价对比。
- `id`: 主键
- `quoteSheetId`: 所属报价单
- `supplierId`: 供应商
- `categoryId`: 品类
- `compareKey`: 对比规格标识（解决同类产品不同写法问题，如：阀门-DN50-法兰球阀）
- `productName`: 产品名称
- `model`: 型号/规格
- `unit`: 单位
- `price`: 报价
- `includesTax`: 是否含税
- `taxRate`: 税率
- `includesFreight`: 是否含运费
- `minOrderQty`: 最小起订量
- `deliveryTime`: 交期
- `paymentTerms`: 付款条件
- `warranty`: 质保期
- `priceNotes`: 价格备注
- `isArchived`: 是否已归档
- `archivedAt`: 归档时间
- `createdAt`: 创建时间

## 6.7 供应商评分表：SupplierScore
以“供应商 + 品类”为单位进行评分。
- `id`: 主键
- `supplierId`: 关联供应商
- `categoryId`: 关联品类
- `scorerId`: 评分人
- `scoreDate`: 评分日期
- `qualityScore`: 产品匹配度 / 质量，25分
- `priceScore`: 价格竞争力，20分
- `deliveryScore`: 交付能力，15分
- `afterSalesScore`: 售后服务，15分
- `cooperationScore`: 平台合作意愿，10分
- `paymentScore`: 账期/付款条件，10分
- `regionScore`: 区域覆盖能力，5分
- `totalScore`: 总分，100分
- `systemLevel`: 系统建议等级
- `manualLevel`: 手动调整等级
- `finalLevel`: 最终等级
- `scoreReason`: 评分说明
- `isArchived`: 是否已归档
- `archivedAt`: 归档时间
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

## 6.8 调研/考察记录表：InvestigationRecord
- `id`: 主键
- `type`: 展会 / 线上沟通 / 实地考察 / 电话沟通 / 微信沟通
- `supplierId`: 关联供应商
- `categoryId`: 关联品类
- `date`: 日期
- `location`: 所在地区
- `participants`: 参与人员
- `keyPoints`: 沟通重点
- `productHighlights`: 产品亮点
- `priceInfo`: 价格情况
- `qualificationInfo`: 资质情况
- `deliveryInfo`: 交付情况
- `afterSalesInfo`: 售后情况
- `risks`: 风险点
- `nextActions`: 后续动作
- `recommendFollowUp`: 是否推荐继续跟进
- `notes`: 备注
- `isArchived`: 是否已归档
- `archivedAt`: 归档时间
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

## 7.1 供应商开发流程：SupplierDevelopmentProcess
用于平台供应商资源池建设。
- `id`: 主键
- `supplierId`: 供应商
- `categoryId`: 品类
- `currentStage`: 当前阶段
- `ownerId`: 负责人
- `priority`: 高 / 中 / 低
- `dueDate`: 截止时间
- `currentProblem`: 当前问题
- `nextAction`: 下一步动作
- `needBossDecision`: 是否需要老板决策
- `needSalesSupport`: 是否需要销售部门配合
- `needBusinessAssistantSupport`: 是否需要商务总助配合
- `status`: 进行中 / 已完成 / 暂停 / 淘汰
- `remark`: 备注
- `isArchived`: 是否已归档
- `archivedAt`: 归档时间
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

## 7.2 采购执行流程：PurchaseExecutionProcess
用于具体采购事项跟进。支持完整的采购闭环管理。
- `id`: 主键
- `title`: 采购事项名称
- `supplierId`: 供应商
- `categoryId`: 品类
- `requesterId`: 采购需求提交人
- `ownerId`: 负责人
- `salesPersonId`: 销售/配合人员
- `currentStage`: 当前阶段
- `priority`: 高 / 中 / 低
- `dueDate`: 截止时间
- `currentProblem`: 当前问题
- `nextAction`: 下一步动作
- `needBossDecision`: 是否需要老板决策
- `needPaymentRequest`: 是否需要付款申请
- `purchaseAmount`: 采购金额
- `contractNo`: 合同编号
- `contractDate`: 合同日期
- `paymentRequestDate`: 付款申请日期
- `arrivalDate`: 到货日期
- `acceptanceDate`: 验收日期
- `invoiceDate`: 发票日期
- `invoiceNo`: 发票号
- `prepaymentAmount`: 预付款金额
- `offsetAmount`: 已抵充金额
- `hasArrived`: 是否已到货
- `hasAccepted`: 是否已验收
- `hasInvoice`: 是否已开票
- `hasPrepaymentOffset`: 是否涉及预付款抵充
- `status`: 进行中 / 已完成 / 暂停 / 异常
- `remark`: 备注
- `isArchived`: 是否已归档
- `archivedAt`: 归档时间
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

## 11. 行政事项：AdminTask
行政事项独立管理，现已改为个人归属数据。
- `id`: 主键
- `title`: 事项名称
- `type`: 类型（会议/周报/办公采购/接待等）
- `ownerPersonId`: 归属人员（只展示给当前登录账号绑定的对应人员）
- `createdByPersonId`: 创建人
- `assigneePersonId`: 负责人，第一版默认等于当前登录人员
- `priority`: 高 / 中 / 低
- `dueDate`: 截止时间
- `taskDate`: 事项所属日期，用于日历落点和日/周/月/年统计；旧数据由 `dueDate` 回填。
- `startTime`: 可选开始时间，格式为 `HH:mm`。
- `endTime`: 可选结束时间，格式为 `HH:mm`，必须晚于 `startTime`。
- `isRecurring`: 是否重复事项
- `recurrenceType`: 重复规则，取值为 `none` / `daily` / `weekly` / `monthly` / `yearly`。
- `recurrenceEndDate`: 重复结束日期，可为空。
- `status`: 未开始 / 进行中 / 已完成 / 暂停
- `completedAt`: 完成时间
- `notes`: 备注
- `isArchived`: 是否已归档
- `archivedAt`: 归档时间
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

> 说明：“行政事项归档”属于个人数据归档，仅本人可查看、恢复，并支持本人彻底删除自己的归档行政事项。

## 12. 销售/商务资料表：SalesMaterial
用于生成对外销售/商务支持时的正式资料。
- `id`: 主键
- `title`: 资料名称
- `categoryId`: 适用品类
- `targetAudience`: 销售部门 / 商务总助 / 安装公司 / 老板 / 客户
- `coreSellingPoints`: 核心卖点
- `priceAdvantage`: 价格优势
- `supplierAdvantage`: 供应商优势
- `qualificationSupport`: 资质背书
- `deliveryAdvantage`: 交付优势
- `afterSalesAdvantage`: 售后优势
- `riskNotice`: 风险提示
- `formalText`: 正式资料正文
- `isArchived`: 是否已归档
- `archivedAt`: 归档时间
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

## 13. 系统设置表：SystemSetting
用于保存全局配置。
- `id`: 主键
- `key`: 配置键（例如：公司名称、默认负责人、数据备份路径、CSV导入模板版本等）
- `value`: 配置值
- `notes`: 备注说明
- `updatedAt`: 更新时间

## 13.1 登录账号表：User
用于系统登录认证，并可选绑定到一条 Person 记录。
- `id`: 主键
- `username`: 用户名（唯一）
- `passwordHash`: 密码哈希
- `name`: 登录显示姓名
- `personId`: 绑定的内部人员 ID（可空、唯一）
- `isAdmin`: 是否管理员
- `isActive`: 是否启用
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

## 13.2 Agent API Token 表：AgentApiToken
用于给 Codex、Claude Code CLI、OpenClaw 等内部 agent 授权调用 REST API。
- `id`: 主键
- `name`: Token 名称
- `tokenPrefix`: Token 前缀（用于识别，不是完整明文）
- `tokenHash`: Token 哈希（唯一；不保存明文）
- `userId`: 绑定登录账号
- `isActive`: 是否启用
- `lastUsedAt`: 最近使用时间
- `revokedAt`: 停用时间
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

> 明文 Token 仅在创建或重置时返回一次。Token 权限等同绑定用户；管理员接口仍要求绑定用户具备管理员权限。

## 13.3 Agent API 审计日志表：AgentApiLog
记录 agent token 的 API 使用痕迹，不保存完整请求体。
- `id`: 主键
- `tokenId`: 关联 AgentApiToken，可空
- `userId`: 关联 User，可空
- `method`: HTTP 方法
- `path`: 请求路径
- `statusCode`: 响应状态码或授权记录状态
- `targetType`: 目标对象类型，可空
- `targetId`: 目标对象 ID，可空
- `createdAt`: 创建时间

## 14. 附件表：Attachment
统一管理各类文件的本地路径关联，避免各表单独设置 filePath 导致混乱。
- `id`: 主键
- `relatedType`: 关联类型（例如：Supplier, QuoteSheet 等）
- `relatedId`: 关联数据的 ID
- `fileName`: 文件名
- `filePath`: 文件的本地绝对或相对路径
- `fileType`: 文件类型/扩展名
- `notes`: 附件说明
- `isArchived`: 是否已归档
- `archivedAt`: 归档时间
- `createdAt`: 创建时间

## 15. 风险标签表：RiskTag & SupplierRiskTag
用于固定标签与结构化的风险管理。
**RiskTag** (预置标签表):
- `id`: 主键
- `name`: 标签名称（预置如：价格偏高 / 交期不稳定 / 资质不完整 / 售后能力弱 等）
- `color`: 标签颜色
- `notes`: 备注
- `createdAt`: 创建时间

**SupplierRiskTag** (供应商风险关联表):
- `supplierId`: 关联供应商 ID
- `riskTagId`: 关联风险标签 ID
> 注：supplierId + riskTagId 必须添加复合唯一约束，防止重复添加同一个标签。

## 关于待办中心 (Task) 的特殊说明
> **待办中心第一版不单独建复杂 Task 表，先从流程表 + 行政事项表聚合展示。**
待办来源包括：
1. `SupplierDevelopmentProcess.dueDate` 未完成事项
2. `PurchaseExecutionProcess.dueDate` 未完成事项
3. `needBossDecision = true` 的流程事项
4. `needSalesSupport = true` 的供应商开发事项
5. 当前登录账号绑定人员名下的 `AdminTask.dueDate` 未完成事项

> **统计口径说明：**
> - **本周待办**：`dueDate` 在本周一到本周日之间，且状态不是已完成/归档/淘汰/异常。
> - **超期待办**：`dueDate` 小于今天，且状态不是已完成/归档/淘汰/异常。
> - **老板决策事项**：`needBossDecision = true`，且状态不是已完成/归档/淘汰/异常。
> - **销售配合事项**：`needSalesSupport = true`，且状态不是已完成/归档/淘汰/异常。
