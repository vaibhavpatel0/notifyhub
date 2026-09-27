-- =====================================================================
-- Sample data: one demo tenant ("vits"), clearly flagged is_demo = true.
-- The portal shows a "Demo college, sample data" notice for demo tenants.
-- Dates are relative to now() so the demo always has upcoming events.
-- Admin logins are created separately by scripts/create-demo-users.ts,
-- because auth users must be created through Supabase Auth.
-- =====================================================================

insert into public.colleges (
  id, name, short_name, slug, official_website, website_domain, official_email,
  description, about, welcome_heading, welcome_text, address, phone, contact_email,
  social_links, brand_color, is_demo, status, verification_status, verification_method,
  verified_at, published_at
) values (
  '00000000-0000-4000-8000-000000000001',
  'Vignan Institute of Technology',
  'VITS',
  'vits',
  'https://www.examplecollege.ac.in',
  'examplecollege.ac.in',
  'admin@examplecollege.ac.in',
  'Sample college used to demonstrate NotifyHub. All names, notices and events on this portal are sample data.',
  E'This is a demonstration portal. The college, its departments, notices and events are sample data created to show how a NotifyHub portal works.\n\nA real college would describe its history, accreditation, programmes and campus here. College admins edit this text from Admin > College profile.',
  'Welcome to Vignan Institute of Technology',
  'Official notices, exam schedules, placement updates and campus events, in one place. No sign-in needed.',
  'Sample address, Hyderabad, Telangana',
  '+91 00000 00000',
  'office@examplecollege.ac.in',
  '{"website": "https://www.examplecollege.ac.in"}'::jsonb,
  '#1f4e8c',
  true, 'active', 'verified', 'manual', now(), now()
) on conflict (id) do nothing;

insert into public.departments (id, college_id, name, code, slug, description, head_name, sort_order) values
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-000000000001',
   'Computer Science and Engineering', 'CSE', 'cse',
   'Undergraduate and postgraduate programmes in computing, with labs for systems, networks and machine learning.',
   'Dr. A. Sample (Head of Department)', 1),
  ('00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-000000000001',
   'Electronics and Communication Engineering', 'ECE', 'ece',
   'Signals, embedded systems, VLSI and communication systems.',
   'Dr. B. Sample (Head of Department)', 2),
  ('00000000-0000-4000-8000-0000000000d3', '00000000-0000-4000-8000-000000000001',
   'Electrical and Electronics Engineering', 'EEE', 'eee',
   'Power systems, machines, control and renewable energy.',
   'Dr. C. Sample (Head of Department)', 3),
  ('00000000-0000-4000-8000-0000000000d4', '00000000-0000-4000-8000-000000000001',
   'Mechanical Engineering', 'MECH', 'mechanical',
   'Design, manufacturing, thermal engineering and robotics.',
   'Dr. D. Sample (Head of Department)', 4),
  ('00000000-0000-4000-8000-0000000000d5', '00000000-0000-4000-8000-000000000001',
   'Civil Engineering', 'CIVIL', 'civil',
   'Structures, geotechnics, transportation and environmental engineering.',
   'Dr. E. Sample (Head of Department)', 5)
on conflict (id) do nothing;

insert into public.announcements
  (college_id, department_id, scope, title, category, is_urgent, is_pinned, published_at, expires_at, description)
values
  ('00000000-0000-4000-8000-000000000001', null, 'college',
   'Internal Examination Schedule (Mid-II)', 'examination', true, false,
   now() - interval '2 hours', now() + interval '20 days',
   E'Mid-II internal examinations for all B.Tech II, III and IV year students begin on '
   || to_char(now() + interval '9 days', 'FMDD FMMonth YYYY') || E'.\n\n'
   || E'Forenoon session: 10:00 AM to 11:30 AM\nAfternoon session: 2:00 PM to 3:30 PM\n\n'
   || E'Students must carry their college ID card. Seating plans will be displayed outside each block one day before the first exam. '
   || E'Students with attendance below 65% should meet their class coordinator before the exams begin.'),

  ('00000000-0000-4000-8000-000000000001', null, 'college',
   'Placement Drive Registration Open', 'placement', false, false,
   now() - interval '1 day', now() + interval '6 days',
   E'Registrations are open for the on-campus recruitment drive for final-year B.Tech students of CSE, ECE and EEE.\n\n'
   || E'Eligibility: 60% aggregate with no active backlogs.\n'
   || E'Registration closes on ' || to_char(now() + interval '5 days', 'FMDD FMMonth YYYY') || E'.\n\n'
   || E'Register through the placement cell. Bring an updated resume and two passport-size photographs on the day of the drive.'),

  ('00000000-0000-4000-8000-000000000001', null, 'college',
   'Holiday Announcement', 'holiday', false, false,
   now() - interval '3 days', now() + interval '12 days',
   E'The college will remain closed on ' || to_char(now() + interval '11 days', 'FMDD FMMonth YYYY')
   || E' on account of a public holiday. Classes will resume on the next working day as per the regular timetable.\n\n'
   || E'The library and hostel mess will follow holiday timings.'),

  ('00000000-0000-4000-8000-000000000001', null, 'college',
   'Anti-ragging undertaking: submission deadline', 'important', false, true,
   now() - interval '5 days', now() + interval '25 days',
   E'All first-year students and their parents must submit the online anti-ragging undertaking before '
   || to_char(now() + interval '14 days', 'FMDD FMMonth YYYY')
   || E'. Submit the acknowledgement copy to the office of the Dean of Student Affairs.'),

  ('00000000-0000-4000-8000-000000000001', null, 'college',
   'Revised library timings', 'circular', false, false,
   now() - interval '6 days', null,
   E'From this week the central library is open from 8:30 AM to 8:00 PM on working days and 9:00 AM to 1:00 PM on Saturdays. '
   || E'The digital library section remains open until 9:00 PM during examination weeks.'),

  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000d1', 'department',
   'CSE: Lab internal evaluation schedule', 'examination', true, false,
   now() - interval '5 hours', now() + interval '10 days',
   E'Lab internal evaluations for CSE II and III year sections will be held in the week of '
   || to_char(now() + interval '4 days', 'FMDD FMMonth') || E'.\n\n'
   || E'Complete and submit your lab records to the lab in-charge before the evaluation. Batch-wise slots are posted on the CSE block notice board and here.'),

  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000d2', 'department',
   'ECE: Registration for embedded systems workshop', 'workshop', false, false,
   now() - interval '2 days', now() + interval '5 days',
   E'A two-day hands-on workshop on embedded systems with ARM microcontrollers is open to ECE and EEE students. Seats are limited to 60.'),

  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000d4', 'department',
   'MECH: Industrial visit consent forms', 'academic', false, false,
   now() - interval '4 days', now() + interval '8 days',
   E'Third-year Mechanical students going on the industrial visit must submit signed parent consent forms to the department office.');

insert into public.events
  (college_id, department_id, scope, title, description, venue, organizer, starts_at, ends_at, registration_url, countdown_enabled)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000d1', 'department',
   'CSE Hackathon 2026',
   E'A 24-hour team hackathon for students of all years. Teams of two to four. Problem statements are released at the opening session. Mentors from the CSE faculty will be available throughout.',
   'Seminar Hall, CSE Block', 'Department of CSE',
   ((date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '3 days 9 hours') at time zone 'Asia/Kolkata'),
   ((date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '4 days 9 hours') at time zone 'Asia/Kolkata'),
   'https://example.com/register', true),

  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000d2', 'department',
   'Technical Workshop: Embedded Systems',
   E'Two-day hands-on workshop covering ARM Cortex-M programming, peripherals and a small IoT project. Bring a laptop.',
   'ECE Lab 3', 'Department of ECE',
   ((date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '6 days 10 hours') at time zone 'Asia/Kolkata'),
   ((date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '6 days 16 hours') at time zone 'Asia/Kolkata'),
   null, true),

  ('00000000-0000-4000-8000-000000000001', null, 'college',
   'Annual Cultural Fest',
   E'Two days of music, dance, drama and literary events organised by the student council. Open to all students; external participants need a college ID.',
   'Main Auditorium and Open Air Theatre', 'Student Council',
   ((date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '20 days 9 hours') at time zone 'Asia/Kolkata'),
   ((date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '21 days 21 hours') at time zone 'Asia/Kolkata'),
   null, true),

  ('00000000-0000-4000-8000-000000000001', null, 'college',
   'Alumni Meet',
   E'Graduates of the last ten batches met current students to talk about careers, higher studies and entrepreneurship.',
   'Main Auditorium', 'Alumni Relations Cell',
   ((date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '-10 days 10 hours') at time zone 'Asia/Kolkata'),
   ((date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '-10 days 13 hours') at time zone 'Asia/Kolkata'),
   null, false);

-- Which student years each sample notice and event is for (empty = every year).
update public.announcements set years = '{2,3,4}' where college_id = '00000000-0000-4000-8000-000000000001' and title = 'Internal Examination Schedule (Mid-II)';
update public.announcements set years = '{4}'     where college_id = '00000000-0000-4000-8000-000000000001' and title = 'Placement Drive Registration Open';
update public.announcements set years = '{1}'     where college_id = '00000000-0000-4000-8000-000000000001' and title = 'Anti-ragging undertaking: submission deadline';
update public.announcements set years = '{2,3}'   where college_id = '00000000-0000-4000-8000-000000000001' and title = 'CSE: Lab internal evaluation schedule';
update public.announcements set years = '{3}'     where college_id = '00000000-0000-4000-8000-000000000001' and title = 'MECH: Industrial visit consent forms';
update public.events        set years = '{2,3}'   where college_id = '00000000-0000-4000-8000-000000000001' and title = 'Technical Workshop: Embedded Systems';
