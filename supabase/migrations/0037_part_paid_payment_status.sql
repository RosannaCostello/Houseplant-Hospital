-- HIL-128: part_paid visit payment status (standard paid; pests surcharge still owed)

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'pos_payment_status'
      and e.enumlabel = 'part_paid'
  ) then
    alter type public.pos_payment_status add value 'part_paid';
  end if;
end $$;
