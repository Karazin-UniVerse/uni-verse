sed -i '' 's/if (role && role !== '\''ADMIN'\'' && process.env.NODE_ENV === '\''production'\'')/if (role !== '\''ADMIN'\'')/g' packages/backend/admin/admin.controller.ts
sed -i '' 's/if ( callerRole && callerRole !== '\''ADMIN'\'' && process.env.NODE_ENV === '\''production'\'' )/if (callerRole !== '\''ADMIN'\'')/g' packages/backend/admin/admin.controller.ts
sed -i '' 's/callerRole &&//g' packages/backend/admin/admin.controller.ts
sed -i '' 's/callerRole !== '\''ADMIN'\'' &&//g' packages/backend/admin/admin.controller.ts
sed -i '' 's/process.env.NODE_ENV === '\''production'\''//g' packages/backend/admin/admin.controller.ts
