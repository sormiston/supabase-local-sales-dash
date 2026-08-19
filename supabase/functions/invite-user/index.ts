import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '@supabase/supabase-js/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return Response.json({ ok: true }, { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const {
    data: { user },
  } = await callerClient.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const { data: isTeamLead } = await callerClient.rpc('is_team_lead')
  if (!isTeamLead) return new Response('Forbidden', { status: 403, headers: corsHeaders })

  const { email, fullName, role } = await req.json()
  if (!email || !fullName || !['rep', 'team_lead'].includes(role)) {
    return new Response('Invalid request', { status: 400, headers: corsHeaders })
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // full_name and role both go into user_metadata: a database trigger
  // (handle_new_user, on auth.users) reads them to create the matching
  // user_profiles row itself. Safe despite user_metadata being user-editable
  // later via auth.updateUser: the trigger only runs once, at creation, and
  // role is gated on the caller being an existing team lead (checked above)
  // -- from then on user_profiles.role is unwritable by the user themselves
  // (see the trigger's migration), so a later metadata edit can't change it.
  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role },
  })
  if (inviteError) {
    return new Response(inviteError.message, { status: 400, headers: corsHeaders })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
