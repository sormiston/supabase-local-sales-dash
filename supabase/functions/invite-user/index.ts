import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const {
    data: { user },
  } = await callerClient.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: isTeamLead } = await callerClient.rpc('is_team_lead')
  if (!isTeamLead) return new Response('Forbidden', { status: 403 })

  const { email, fullName, role } = await req.json()
  if (!email || !fullName || !['rep', 'team_lead'].includes(role)) {
    return new Response('Invalid request', { status: 400 })
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Only full_name (harmless) goes into user_metadata via the invite --
  // never role. user_metadata is user-editable later via auth.updateUser,
  // so it must never be treated as authoritative for authorization.
  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    { data: { full_name: fullName } },
  )
  if (inviteError || !invited.user) {
    return new Response(inviteError?.message ?? 'Invite failed', { status: 400 })
  }

  // Role is authoritative from this row, written directly with service_role
  // (bypasses RLS), immediately after the auth.users row is created.
  const { error: profileError } = await adminClient
    .from('user_profiles')
    .insert({ id: invited.user.id, full_name: fullName, role })
  if (profileError) return new Response(profileError.message, { status: 500 })

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
