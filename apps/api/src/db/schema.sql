-- ============================================================================
-- Servios Database Schema
-- Managed via Supabase Dashboard and migrations
-- ============================================================================

-- Core tables:
-- users                          (extends Supabase auth.users)
-- customer_profiles
-- provider_profiles
-- landlord_profiles
-- tenant_profiles

-- Property management:
-- properties
-- tenants                        (tenant ↔ property linking)
-- property_compliance

-- Services & bookings:
-- services                       (service types / categories)
-- provider_services              (provider ↔ service offerings)
-- availability_slots
-- bookings
-- booking_milestones
-- payments

-- Maintenance:
-- maintenance_requests

-- Messaging:
-- conversations
-- conversation_participants
-- messages

-- Social / trust:
-- reviews
-- disputes
-- invitations
-- landlord_provider_relationships

-- Platform:
-- notifications
-- documents
-- analytics_events
