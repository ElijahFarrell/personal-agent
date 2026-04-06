/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adsPipelineRuns from "../adsPipelineRuns.js";
import type * as auditSubmissions from "../auditSubmissions.js";
import type * as automationTriggers from "../automationTriggers.js";
import type * as billing from "../billing.js";
import type * as callLogs from "../callLogs.js";
import type * as chatJobs from "../chatJobs.js";
import type * as compliance from "../compliance.js";
import type * as constants from "../constants.js";
import type * as contentDrafts from "../contentDrafts.js";
import type * as contextDocs from "../contextDocs.js";
import type * as credits from "../credits.js";
import type * as dailyTodos from "../dailyTodos.js";
import type * as inbox from "../inbox.js";
import type * as inboxAiUsage from "../inboxAiUsage.js";
import type * as inboxOutboundEvents from "../inboxOutboundEvents.js";
import type * as inboxSyncUsage from "../inboxSyncUsage.js";
import type * as integrations from "../integrations.js";
import type * as marketingChatLeads from "../marketingChatLeads.js";
import type * as marketingMetrics from "../marketingMetrics.js";
import type * as messages from "../messages.js";
import type * as migrations from "../migrations.js";
import type * as prospects from "../prospects.js";
import type * as schedules from "../schedules.js";
import type * as skillContent from "../skillContent.js";
import type * as skills from "../skills.js";
import type * as smsLogs from "../smsLogs.js";
import type * as telegram from "../telegram.js";
import type * as tenantConfigs from "../tenantConfigs.js";
import type * as tenants from "../tenants.js";
import type * as threads from "../threads.js";
import type * as timeSavings from "../timeSavings.js";
import type * as unipileAccounts from "../unipileAccounts.js";
import type * as userAgentSettings from "../userAgentSettings.js";
import type * as userDashboardPreferences from "../userDashboardPreferences.js";
import type * as users from "../users.js";
import type * as videoGeneration from "../videoGeneration.js";
import type * as workflowDefinitions from "../workflowDefinitions.js";
import type * as workflowRuns from "../workflowRuns.js";
import type * as workflowSnapshots from "../workflowSnapshots.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adsPipelineRuns: typeof adsPipelineRuns;
  auditSubmissions: typeof auditSubmissions;
  automationTriggers: typeof automationTriggers;
  billing: typeof billing;
  callLogs: typeof callLogs;
  chatJobs: typeof chatJobs;
  compliance: typeof compliance;
  constants: typeof constants;
  contentDrafts: typeof contentDrafts;
  contextDocs: typeof contextDocs;
  credits: typeof credits;
  dailyTodos: typeof dailyTodos;
  inbox: typeof inbox;
  inboxAiUsage: typeof inboxAiUsage;
  inboxOutboundEvents: typeof inboxOutboundEvents;
  inboxSyncUsage: typeof inboxSyncUsage;
  integrations: typeof integrations;
  marketingChatLeads: typeof marketingChatLeads;
  marketingMetrics: typeof marketingMetrics;
  messages: typeof messages;
  migrations: typeof migrations;
  prospects: typeof prospects;
  schedules: typeof schedules;
  skillContent: typeof skillContent;
  skills: typeof skills;
  smsLogs: typeof smsLogs;
  telegram: typeof telegram;
  tenantConfigs: typeof tenantConfigs;
  tenants: typeof tenants;
  threads: typeof threads;
  timeSavings: typeof timeSavings;
  unipileAccounts: typeof unipileAccounts;
  userAgentSettings: typeof userAgentSettings;
  userDashboardPreferences: typeof userDashboardPreferences;
  users: typeof users;
  videoGeneration: typeof videoGeneration;
  workflowDefinitions: typeof workflowDefinitions;
  workflowRuns: typeof workflowRuns;
  workflowSnapshots: typeof workflowSnapshots;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
