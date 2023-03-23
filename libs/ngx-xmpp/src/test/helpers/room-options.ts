// SPDX-License-Identifier: AGPL-3.0-or-later
export interface RoomOptions {
  title: string;
  description: string;
  allow_change_subj: string;
  allow_query_users: string;
  allow_private_messages: string;
  allow_private_messages_from_visitors: string;
  allow_visitor_status: string;
  allow_visitor_nickchange: string;
  public: string;
  public_list: string;
  persistent: string;
  moderated: string;
  captcha_protected: string;
  members_by_default: string;
  members_only: string;
  allow_user_invites: string;
  allow_subscription: string;
  password_protected: string;
  password: string;
  anonymous: string;
  presence_broadcast: string;
  allow_voice_requests: string;
  voice_request_min_interval: string;
  max_users: string;
  logging: string;
  vcard: string;
  vcard_xupdate: string;
  captcha_whitelist: string;
  mam: string;
  pubsub: string;
  lang: string;
}
