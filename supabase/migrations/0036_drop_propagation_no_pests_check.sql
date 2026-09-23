-- HIL-127 follow-up: allow propagation children to have pests Yes.
-- App already inserts bugs_found=true for pest sources; this check blocked it.

alter table public.plants
  drop constraint if exists plants_propagation_no_pests_check;
