import { NerdGraphQuery } from "nr1";

/**
 * For building account pickers, etc. Get the list of all visible accounts that have
 * data for the given event type. For examlpe, if you send `SystemSample` you'll get
 * a list of all accounts with Infratructure installed.  Clean up those account menus!
 */
export default async function accountsWithData(eventType) {
  const gql = `{actor {accounts {name id reportingEventTypes(filter:["${eventType}"])}}}`;
  const result = await NerdGraphQuery.query({ query: gql });
  if (result.errors) {
    console.warn(
      "Can't get reporting event types because NRDB is grumpy at NerdGraph.",
      result.errors
    );
    console.warn(JSON.stringify(result.errors.slice(0, 5), 0, 2));
    return [];
  }

  return result.data.actor.accounts.filter(
    a => a.reportingEventTypes.length > 0
  );
}
