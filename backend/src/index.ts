import { PrismaClient } from '@prisma/client';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const prisma = new PrismaClient();

const typeDefs = `#graphql
  type Department {
    id: ID!
    name: String!
    city: String!
    horses: [Horse!]!
  }

  type DepartmentHistory {
    id: ID!
    horseId: String!
    departmentId: String!
    startDate: String!
    endDate: String
    department: Department!
  }

  type Horse {
    id: ID!
    name: String!
    sex: String!
    status: String!
    dateOfBirth: String
    departmentId: String
    department: Department
    histories: [DepartmentHistory!]!
    
    sireId: String
    damId: String
    sire: Horse
    dam: Horse
    sired: [Horse!]!
    damed: [Horse!]!
    hasParents: Boolean!
    hasChildren: Boolean!
    parentCount: Int!
    childCount: Int!
  }

  type Query {
    horses: [Horse!]!
    horse(id: ID!): Horse
    departments: [Department!]!
  }

  type Mutation {
    addHorse(name: String!, sex: String!, status: String!, departmentId: String, dateOfBirth: String): Horse!
    updateHorse(id: ID!, name: String, sex: String, status: String, departmentId: String, dateOfBirth: String): Horse!
    deleteHorse(id: ID!): Boolean!
    reparentHorse(childId: ID!, parentId: ID!, role: String!): Horse!
    removeParent(childId: ID!, role: String!): Horse!
    moveHorseDepartment(horseId: ID!, departmentId: String!): Horse!
  }
`;

const resolvers = {
  Query: {
    horses: async () => prisma.horse.findMany(),
    horse: async (_: any, { id }: any) => prisma.horse.findUnique({ where: { id } }),
    departments: async () => prisma.department.findMany(),
  },
  Mutation: {
    addHorse: async (_: any, args: any) => {
      const horse = await prisma.horse.create({ 
        data: { ...args, dateOfBirth: args.dateOfBirth ? new Date(args.dateOfBirth) : null } 
      });
      if (args.departmentId) {
        await prisma.departmentHistory.create({ data: { horseId: horse.id, departmentId: args.departmentId }});
      }
      return horse;
    },
    updateHorse: async (_: any, { id, dateOfBirth, ...data }: any) => {
      return prisma.horse.update({ 
        where: { id }, 
        data: { ...data, dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null } 
      });
    },
    deleteHorse: async (_: any, { id }: any) => {
      await prisma.departmentHistory.deleteMany({ where: { horseId: id } });
      await prisma.horse.updateMany({ where: { sireId: id }, data: { sireId: null } });
      await prisma.horse.updateMany({ where: { damId: id }, data: { damId: null } });
      await prisma.horse.delete({ where: { id } });
      return true;
    },
    reparentHorse: async (_: any, { childId, parentId, role }: any) => {
      const data = role === 'Sire' ? { sireId: parentId } : { damId: parentId };
      return prisma.horse.update({ where: { id: childId }, data });
    },
    removeParent: async (_: any, { childId, role }: any) => {
      const data = role === 'Sire' ? { sireId: null } : { damId: null };
      return prisma.horse.update({ where: { id: childId }, data });
    },
    moveHorseDepartment: async (_: any, { horseId, departmentId }: any) => {
      await prisma.departmentHistory.updateMany({
        where: { horseId, endDate: null },
        data: { endDate: new Date() }
      });
      await prisma.departmentHistory.create({
        data: { horseId, departmentId }
      });
      return prisma.horse.update({ where: { id: horseId }, data: { departmentId } });
    }
  },
  Horse: {
    department: async (parent: any) => parent.departmentId ? prisma.department.findUnique({ where: { id: parent.departmentId } }) : null,
    histories: async (parent: any) => prisma.departmentHistory.findMany({ where: { horseId: parent.id }, orderBy: { startDate: 'desc' } }),
    sire: async (parent: any) => parent.sireId ? prisma.horse.findUnique({ where: { id: parent.sireId } }) : null,
    dam: async (parent: any) => parent.damId ? prisma.horse.findUnique({ where: { id: parent.damId } }) : null,
    sired: async (parent: any) => prisma.horse.findMany({ where: { sireId: parent.id } }),
    damed: async (parent: any) => prisma.horse.findMany({ where: { damId: parent.id } }),
    hasParents: (parent: any) => !!(parent.sireId || parent.damId),
    hasChildren: async (parent: any) => {
      const children = await prisma.horse.count({ where: { OR: [{ sireId: parent.id }, { damId: parent.id }] } });
      return children > 0;
    },
    parentCount: (parent: any) => (parent.sireId ? 1 : 0) + (parent.damId ? 1 : 0),
    childCount: async (parent: any) => prisma.horse.count({ where: { OR: [{ sireId: parent.id }, { damId: parent.id }] } }),
  },
  DepartmentHistory: {
    department: async (parent: any) => prisma.department.findUnique({ where: { id: parent.departmentId } })
  }
};

const app = express();
const server = new ApolloServer({ typeDefs, resolvers });

server.start().then(() => {
  app.use(cors() as any);
  app.use(bodyParser.json() as any);
  app.use('/graphql', expressMiddleware(server) as any);

  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`🚀 Server ready at http://localhost:${port}/graphql`);
  });
});
